/**
 * Created by zJJ on 8/12/2016.
 * XDPF Util
 */
const pdfUtil = require('pdf-util'),
    util = require("util"),
    events = require("events");

const options_instance = {
    interval_pages: 10,
    remove_space_asian_character: true,
    new_paragraph: true,
    from: 0,
    to: 10
};
function xPDFpathStarter(localpath, isEnglish, taskconfig, AysncCallback) {
    this.options = options_instance;
    if (isEnglish) {
        this.options.remove_space_asian_character = false;
        this.options.new_paragraph = true;
    }
    console.log("=== pdf to text ===");
    this.set_config(taskconfig, AysncCallback);
    pdfUtil.info(localpath, function (err, info) {
        if (err) throw(err);
        console.log("=== log info ===");
        console.log(info);
        this.startConfig(0, options_instance.interval_pages, info.pages);
        //options.to = info.pages;
        this.process_pages(localpath);
    }.bind(this));
}
xPDFpathStarter.prototype.set_config = function (taskconfig, AysncCallback) {
    this.options.external = taskconfig;
    this.options.asyncallback = AysncCallback;
};
xPDFpathStarter.prototype.startConfig = function (from, to, maxpages) {
    this.options.from = from;
    this.options.to = to;
    this.options.total_pages = maxpages;
};
xPDFpathStarter.prototype.getConfig = function () {
    return this.options;
};
xPDFpathStarter.prototype.getExternal = function () {
    return this.options.external;
};
xPDFpathStarter.prototype.asyncCallback = function () {
    return this.options.asyncallback;
};
xPDFpathStarter.prototype.process_pages = function (localpath) {
    pdfUtil.pdfToText(localpath, this.options, function (err, data) {
        if (err) {
            console.log("=== error form pdfToText ===");
            //  return callback(err);
            this.emit("error", err);
        }
        const result = {
            content: data,
            src: this.getExternal().url,
            title: "Minutes " + this.getExternal().fieldname + " pages:" + this.getConfig().total_pages,
            metadata: []
        };
        console.log("now processed pages from " + this.getConfig().from + " to " + this.getConfig().to);
        this.emit('scanpage', result);
        var delta = this.getConfig().total_pages - this.getConfig().to;
        if (delta > this.getConfig().interval_pages) {
            var newFrom = this.getConfig().to + 1;
            var newTo = this.getConfig().from + this.getConfig().interval_pages;
            this.startConfig(newFrom, newTo, this.getConfig().total_pages);
            this.process_pages(localpath);
        } else if (delta < this.getConfig().interval_pages) {
            var newFrom = this.getConfig().to + 1;
            var newTo = this.getConfig().total_pages;
            if (newFrom < newTo) {
                this.startConfig(newFrom, newTo, this.getConfig().total_pages);
                this.process_pages(localpath);
            } else {
                if (typeof this.getExternal().postProcess === 'function') {
                    console.log("now start ESK processing now");
                    this.getExternal().postProcess(result, this.asyncCallback);
                }
            }
        } else if (delta < 0) {
            console.error("xpdf process Error : delta < 0 ");
        }
    }.bind(this));
};
util.inherits(xPDFpathStarter, events.EventEmitter);
module.exports = xPDFpathStarter;