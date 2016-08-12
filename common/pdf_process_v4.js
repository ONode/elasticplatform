/**
 * Created by zJJ on 8/12/2016.
 * XDPF Util
 */
const pdfUtil = require('pdf-util');
module.exports = function (localpath, isEnglish, taskconfig, callback) {
    const options = {
        remove_space_asian_character: true,
        new_paragraph: true,
        from: 0,
        to: 10
    };
    if (isEnglish) {
        options.remove_space_asian_character = false;
        options.new_paragraph = true;
    }
    console.log("=== pdf to text ===");
    pdfUtil.info(localpath, function (err, info) {
        if (err) throw(err);
        console.log("=== log info ===");
        console.log(info);
        options.to = info.pages;
        pdfUtil.pdfToText(localpath, options, function (err, data) {
            if (err) {
                console.log("=== error form pdfToText ===");
                return callback(err);
            }
            const result = {
                content: data,
                src: taskconfig.url,
                title: "Minutes " + taskconfig.fieldname + " pages:" + info.pages,
                metadata: []
            };
            if (typeof taskconfig.postProcess === 'function') {
                console.log("now start ESK processing now");
                taskconfig.postProcess(result, callback);
            } else {
                console.log("=== scan completed ===");
                return callback(null, result);
            }
        });
    });
};
