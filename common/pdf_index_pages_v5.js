/**
 * Created by zJJ on 8/12/2016.
 * XDPF Util
 */
"use strict";

const pdfUtil = require('pdf-util'),
  util = require("util"),
  events = require("events");

const options_instance = {
  interval_pages: 15,
  remove_space_asian_character: false,
  new_paragraph: false,
  remove_single_n_english: false,
  from: 0,
  to: 10
};

var xPDFpathStarter = function (config) {
  events.call(this);
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
};
util.inherits(xPDFpathStarter, events);

xPDFpathStarter.prototype.start = function () {
  pdfUtil.info(this.filepath, function (err, info) {
    if (err) throw(err);
    console.log("=== log info ===");
    console.log(info);
    console.log("================");
    this.startConfig(0, this.options.interval_pages, info.pages);
    this.process_pages();
  }.bind(this));
};

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
    this.process_pages();
    return;
  } else if (delta <= this.getConfig().interval_pages) {
    var newFrom = this.getConfig().to + 1;
    var newTo = this.getConfig().total_pages;
    if (newFrom < newTo) {
      this.startConfig(newFrom, newTo, this.getConfig().total_pages);
      this.process_pages();
      return;
    } else {
      if (this.getExternal().postProcess != null && typeof this.getExternal().postProcess === 'function') {
        console.log("now start ESK processing now");
        this.getExternal().postProcess("done");
      }
      this.emit('complete', 'done');
      return;
    }
  } else if (delta < 0) {
    console.error("xpdf process Error : delta < 0 ");
  } else {
    console.error("nothing to do.. next tick");
    this.next_wave();
  }
};

xPDFpathStarter.prototype.gc = function () {
  if (global.gc) {
    global.gc();
  } else {
    console.warn('No GC hook! Start your program as `node --expose-gc file.js`.');
  }
};
xPDFpathStarter.prototype.process_pages = function () {
  // process.nextTick(function (callback) {
  // console.log("> start pdf processing");
  pdfUtil.pdfToText(this.filepath, this.options, function (err, data) {
    if (err) {
      console.log("=== error form pdfToText ===");
      console.log("out", err);
      this.emit("error", err.message);
      this.next_wave();
      return;
    }
    const result = {
      content: data,
      title: "minutes page " + this.getConfig().from + "-" + this.getConfig().to,
      metadata: []
    };
    result.data_internal_key = this.getExternal().data_internal_key;
    result.data_read_order = this.getExternal().data_read_order;
    result.data_source_url = this.getExternal().url;

    if (data.length > 0) {
      console.log("now processed pages: " + this.getConfig().from + " - " + this.getConfig().to);
      this.emit('scanpage', result);
    } else {
      this.next_wave();
    }
  }.bind(this));
  // }.bind(this));
};

module.exports = xPDFpathStarter;