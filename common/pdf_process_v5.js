/**
 * Created by zJJ on 8/12/2016.
 * XDPF Util
 */
const pdfUtil = require('pdf-util'),
    util = require("util"),
    events = require("events");

const options_instance = {
    interval_pages: 5,
    remove_space_asian_character: false,
    new_paragraph: false,
    remove_single_n_english: false,
    from: 0,
    to: 10
};
function xPDFpathStarter(config) {
    this.options = options_instance;
    this.filepath = config.out;
    if (config.isEnglish) {
        this.options.remove_space_asian_character = false;
        this.options.new_paragraph = true;
        this.options.remove_single_n_english = true;
    } else {
        this.options.remove_space_asian_character = true;
        this.options.new_paragraph = true;
        this.options.remove_single_n_english = false;
    }
    console.log("=== pdf to text ===");
    this.set_config(config);
    pdfUtil.info(localpath, function (err, info) {
        if (err) throw(err);
        console.log("=== log info ===");
        console.log(info);
        this.startConfig(0, options_instance.interval_pages, info.pages);
        this.process_pages(localpath);
    }.bind(this));
}
xPDFpathStarter.prototype.set_config = function (config) {
    this.options.external = config;
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
xPDFpathStarter.prototype.next_wave = function () {
    var delta = this.getConfig().total_pages - this.getConfig().to;
    if (delta > this.getConfig().interval_pages) {
        var newFrom = this.getConfig().to + 1;
        var newTo = this.getConfig().from + this.getConfig().interval_pages;
        this.startConfig(newFrom, newTo, this.getConfig().total_pages);
        console.log("next wave 1");
        this.process_pages();
    } else if (delta < this.getConfig().interval_pages) {
        var newFrom = this.getConfig().to + 1;
        var newTo = this.getConfig().total_pages;
        if (newFrom < newTo) {
            this.startConfig(newFrom, newTo, this.getConfig().total_pages);
            console.log("next wave 2");
            this.process_pages();
        } else {
            if (this.getExternal().postProcess != null && typeof this.getExternal().postProcess === 'function') {
                console.log("now start ESK processing now");
                this.getExternal().postProcess("done");
            }
            console.log("next wave 3");
            this.emit('complete', 'done');
        }
    } else if (delta < 0) {
        console.error("xpdf process Error : delta < 0 ");
    }
};
xPDFpathStarter.prototype.process_pages = function () {
    pdfUtil.pdfToText(this.filepath, this.options, function (err, data) {
        if (err) {
            console.log("=== error form pdfToText ===");
            this.emit("error", err);
        }
        const result = {
            content: data,
            title: "minutes page " + this.getConfig().from + "-" + this.getConfig().to,
            metadata: []
        };
        console.log("now processed pages from " + this.getConfig().from + " to " + this.getConfig().to);

        result.data_internal_key = this.getExternal().data_internal_key;
        result.data_read_order = this.getExternal().data_read_order;
        result.data_source_url = this.getExternal().url;

        if (data.length > 0) {
            this.emit('scanpage', result);
        } else {
            this.next_wave();
        }
    }.bind(this));
};
util.inherits(xPDFpathStarter, events.EventEmitter);
module.exports = xPDFpathStarter;