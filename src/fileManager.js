const StreamObject = require('stream-json/streamers/StreamObject');
const StreamArray = require('stream-json/streamers/StreamArray');
const path = require('path');
const fs = require('fs');


isJSONEmpty = (response) => {
    const stringify = JSON.stringify(response);
    const dataArr = JSON.parse(stringify).data;
    return dataArr.length > 0
}

const readFile = async (fileName) => {
    let items = [];
    return new Promise(r => {
        const fs = require('fs');

        fs.readFile(fileName, (err, data) => { 
            if (err) throw err; 
            else if(isJSONEmpty(data)) {
                items = JSON.parse(data);
            }
            r(items);
        });
    });
}

const writeFile = (fileName, items) => {
    return new Promise(r => {
        
        const stringify = JSON.stringify(items);
        const fs = require('fs');

        fs.writeFile(fileName, stringify, (err) => {
            if(err) throw err;
            else r();
        });
    });
}

const readLargeJSON = (isArray, fileName) => {

    const jsonStream = isArray ? StreamArray.withParser() : StreamObject.withParser();

    return new Promise(r => {

        const items = isArray ? [] : {};

        jsonStream.on('data', 
            ({key, value}) => {
                isArray ? items.push(value) : items[key] = value;
            }
        );

        jsonStream.on('end', () => {
            r(items);
        });

        const filename = path.join(__dirname, fileName);
        fs.createReadStream(filename).pipe(jsonStream.input);
    });
}

module.exports.writeFile = writeFile;
module.exports.readFile = readFile;
module.exports.readLargeJSON = readLargeJSON;