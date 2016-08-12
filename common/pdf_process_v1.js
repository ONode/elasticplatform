/**
 * Created by zJJ on 8/11/2016.
 */
const extract = require('pdf-text-extract');
const logTag = "> log";
module.exports = function (localpath, callback) {
    extract(localpath, {splitPages: false}, function (err, text) {
        if (err) {
            console.log(logTag, "Error start ==================");
            console.dir(err);
            return;
        }
        console.log("==========================================");
        console.dir(text);
    });
};