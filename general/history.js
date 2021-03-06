// Import & export all citation history


const HistoryFormatter = {

	// History file header
	_fileHeader: "HISTORY v.",
	_headerLength: 20,


	// Available history versions
	_allowedVersions: [
		"00.00.00"
	],


	// Element marker (group separator)
	_elementMarker: String.fromCharCode(29),


	// Different element numbers
	_elements: [
		["title", ""],
		["url", ""],
		["authors", []],
		["publishers", []],
		["publishdate", {}],
		["accessdate", {}]
	],


	// Metadata property order
	_metadata: [
		["format", ""],
		["name", ""],
		["created", {}],
		["modified", {}],
		["containers", []]
	],


	// Check & parse data
	_loadFile: function(data) {
		let accepted = false;

		console.log(data);

		for(let v in this._allowedVersions) {
			let matchString = this._fileHeader + this._allowedVersions[v] + '\r\n';

			if(data.slice(0, this._headerLength) === matchString) {
				accepted = true;
				break;
			}
		}

		if(!accepted) {
			return; // TODO: Error Message
		}

		// Parse data
		return this._parseHistory(data.slice(this._headerLength));
	},


	// Parse history data (string)
	_parseHistory: function(data) {
		let containers = [];
		let citations = [];
		let currentCitation = {}; // Current citation
		let node = {}; // Current citation node

		let length = data.length;
		let index = 0;

		let metadata = false; // Currently parsing metadata
		let metadataIndex = 0;

		while(index < length && index >= 0) {

			// Containers
			if(data[index] === '#') {
				index += 2; // Skip colon
				let name = "";

				while(data[index] !== ';') {
					if(data[index] === '\\') {
						index++;
					}

					name += data[index];
					index++;
				}

				containers.push(name);
				index++;
			}

			// New / existing citation marker
			else if(data[index] === ':') {
				index++;
				metadata = !metadata;

				if(metadata) {
					metadataIndex = -1;
				}
			}

			// Element marker
			else if(data[index] === this._elementMarker) {
				if(node.name) currentCitation[node.name] = node.value;
				index++;

				// Another metadata property
				if(metadata) {
					metadataIndex++;

					node = {
						name: this._metadata[metadataIndex][0],
						value: this._metadata[metadataIndex][1]
					};
				}

				// End of citation
				else if(data[index] === ';') {
					citations.push(currentCitation);
					currentCitation = {};
					node = {};
					index++;
				}

				// Another citation property
				else {
					let number = Number(data[index]);
					index += 2; // Skip colon

					node = {
						name: this._elements[number][0],
						value: this._elements[number][1]
					};
				}
			}

			// Dates
			else if(data[index] === '<') {
				if(typeof node.value !== 'object') {
					console.error("Parse Error");
					break; // TODO: Parse Error
				}

				index++;

				let months = [
					"Jan", "Feb", "Mar", "Apr",
					"May", "Jun", "Jul", "Aug",
					"Sep", "Oct", "Nov", "Dec"
				];

				node.value = {
					day: Number(data.slice(index, index + 2)),
					month: months[Number(data.slice(index + 2, index + 4)) - 1],
					year: Number(data.slice(index + 4, index + 8))
				};

				index += 9;
			}

			// Array
			else if(data[index] === '[') {
				if(!Array.isArray(node.value)) {
					console.error("TODO: Parse Error");
					break; // TODO: Parse Error
				}

				node.value = [];

				while(data[index] === '[') {
					index++;

					let result = [];
					let current = "";

					while(data[index] !== ']') {
						if(data[index + 1] === ']') {
							current += data[index];
							result.push(current);
						}

						else if(data[index] === '\\') {
							index++;
							current += data[index];
						}

						else if(data[index] === ',') {
							result.push(current);
							current = "";
						}

						else {
							current += data[index];
						}

						index++;
					}

					node.value.push(result);
					index++;
				}

				if(node.value.length === 1) {
					node.value = node.value[0];
				}
			}

			// String
			else {
				if(typeof node.value !== 'string') {
					console.error("TODO: Parse Error");
					break; // TODO: Parse Error
				}

				node.value = "";

				while(data[index] !== this._elementMarker) {
					if(data[index] === '\\') {
						index++;
					}

					node.value += data[index];
					index++;
				}
			}

		}

		for(let c in citations) {
			for(let a in citations[c].authors) {
				citations[c].authors[a] = {
					prefix: citations[c].authors[a][0],
					firstname: citations[c].authors[a][1],
					middlename: citations[c].authors[a][2],
					lastname: citations[c].authors[a][3]
				};
			}
		}

		return {
			error: false,
			containers: containers,
			citations: citations
		};
	},


	// Convert history data (object) to a string
	_stringifyHistory: function(object) {
		let result = "";

		for(let c in object.containers) {
			result += `#:${object.containers[c]};`;
		}

		for(let c in object.citations) {
			result += ':';

			for(let m in this._metadata) {
				result += this._elementMarker;

				let value = object.citations[c][this._metadata[m][0]];
				console.log("Getting", this._metadata[m][0], "Result:", value);

				// Arrays
				if(Array.isArray(value)) {
					if(Array.isArray(value[0])) {
						let temp = [];

						for(let v1 in value) {
							let current = "";

							for(let v2 in value[v1]) {
								current += ',';
								current += value[v1][v2].toString();
							}

							temp.push(current.slice(1));
						}

						value = '[' + temp.join('][') + ']';
					}
					else {
						let temp = "";

						for(let v in value) {
							temp += ',';
							temp += value[v].toString();
						}

						value = '[' + temp.slice(1) + ']';
					}
				}

				// Dates
				else if(typeof value === 'object') {
					let temp = {
						day: ('0' + value.day).slice(-2),
						month: ('0' + (value.month + 1)).slice(-2),
						year: value.year.toString()
					};

					value = '<' + temp.day + temp.month + temp.year + '>';
				}

				result += value;
			}

			result += ':';

			for(let e in this._elements) {
				result += this._elementMarker + e + ':';

				let value = object.citations[c][this._elements[e][0]];

				// Arrays
				if(Array.isArray(value)) {
					if(Array.isArray(value[0])) {
						let temp = [];

						for(let v1 in value) {
							let current = "";

							for(let v2 in value[v1]) {
								current += ',';
								current += value[v1][v2].toString();
							}

							temp.push(current.slice(1));
						}

						value = '[' + temp.join('][') + ']';
					}
					else {
						let temp = "";

						for(let v in value) {
							temp += ',';
							temp += value[v].toString();
						}

						value = '[' + temp.slice(1) + ']';
					}
				}

				// Dates
				else if(typeof value === 'object') {
					let months = {
						'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4,
						'May': 5, 'Jun': 6, 'Jul': 7, 'Aug': 8,
						'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
					};

					let temp = {
						day: ('0' + value.day).slice(-2),
						month: ('0' + months[value.month]).slice(-2),
						year: value.year.toString()
					};

					value = '<' + temp.day + temp.month + temp.year + '>';
				}

				result += value;
			}

			result += this._elementMarker + ';';
		}

		return result;
	},


	// Load history from an external file, return result
	import: function(filepath, isFile) {
		return new Promise((resolve, reject) => {

			// Import from a file
			if(isFile) {
				ExtStorage.readFile(filepath, (data) => {
					let result = this._loadFile(data);

					if(result.error) reject(result);
					else resolve(result);
				});
			}

			// Import from chrome storage
			else {
				ExtStorage.get(filepath, (data) => {
					let result = this._loadFile(data[filepath]);

					if(result.error) reject(result);
					else resolve(result);
				});
			}

		});
	},


	// Export a history object as a string
	export: function(details) {
		let result = this._fileHeader + this._allowedVersions[0] + '\r\n';

		result += this._stringifyHistory(details);
		return result;
	}

};
