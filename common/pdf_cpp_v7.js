/**
 * Created by hesk on 16年11月8日.
 */
"use strict";
const pre = require("./pre");
//must follow this order now
var pdfminingV7 = function () {
  this.pages = 0;
  this.cpage = 0;
  this.options = {};
};
pre.util.inherits(pdfminingV7, pre.events);
pdfminingV7.prototype.newInstance = function () {
  this.removeAllListeners("complete");
  this.removeAllListeners("error");
  this.removeAllListeners("scanpage");
  return new pdfminingV7();
};
pdfminingV7.prototype.start = function () {
  this.pdfinfo();
};
pdfminingV7.prototype.initNewConfig = function (config) {
  this.options = config;
  /**
   * config for chinese format
   * @type {boolean}
   */
  this.options.remove_space_asian_character = true;
  this.options.new_paragraph = true;
  this.options.remove_single_n_english = false;

  this.index_trail = [];
  this.iterate = 0;
  this.document_context = "";
  this.pdf_type = -1;
  this.maxpages = 0;
  this.scanBufferTempData = {};
  this.document_date = "";
  this.scan_extras = [];
  this.filepath = config.out;
  //old style trail configuration

  //console.log("=== pdf to text ===");
  this.options.external = config;
  this.options.title = "";
};
pdfminingV7.prototype.startDemo = function () {
  this.emit("complete", "star then the next test");
  return;
};
pdfminingV7.prototype.pdfinfo = function () {
  pre.xpdfUtil.info(this.filepath, function (err, info) {
    if (pre.l.isError(err) || err) {
      console.log("error from getting the document info, and try again...", err);
      return;
    }
    if (this.options.only_preindex) {
      this.emit("complete", "this is the preindex only");
      return;
    }

    if (info == null) {
      console.log("cannot get file basic info, rescan failed...", this.filepath);
      //this.pdfinfo();
      this.next_wave();
      return;
    }

    var nowdate = parseInt(info.creationdate);
    this.document_date = pre.dateFormat(nowdate, "isoDateTime");
    this.maxpages = parseInt(info.pages);

    console.log("=== log info ===");
    console.log(info);
    console.log("================");

    this.updateScanPageConfigSinglePage(1);
    this.process_pages();

  }.bind(this));
};

pdfminingV7.prototype.process_pages = function () {
  pre.xpdfUtil.pdfToText(this.filepath, this.options, function (err, data) {
    if (pre.l.isError(err) || err) {
      console.log("=== error form pdfminer ===");
      console.log("scan page at p" + this.options.from + " to p" + this.options.to);
      console.log("out", err);
      console.log("=== skip this for the next scan ===");
      this.next_wave();
      return;
    }
    this.scan_extras = pre.check_errors(data);
    var pre_filter = pre.fixPreTool(data);
    if (!pre.l.isEmpty(pre_filter)) {
      this.proc_context_type(pre_filter);
    } else {
      this.next_wave();
    }
  }.bind(this));
};
pdfminingV7.prototype.getExt = function () {
  return this.options.external;
};
pdfminingV7.prototype.finalizeResultObject = function (r) {
  r.data_internal_key = this.getExt().data_internal_key || "";
  r.data_read_order = this.getExt().data_read_order || "";
  r.data_source_url = this.getExt().url;
  r.data_bill_title = this.getExt().data_bill_title || "";
  //  console.log("check date", r.data_bill_title);
  return r;
};
pdfminingV7.prototype.resolve_last_buffer = function (callback) {
  if (pre.l.isFunction(callback)) {
    if (!pre.l.isEmpty(this.scanBufferTempData)) {
      const result = {
        content: this.scanBufferTempData.text,
        metadata: [this.getExt().data_bill_title, this.getExt().data_internal_key],
        page: this.scanBufferTempData.page,
        scanrange: {
          start: this.scanBufferTempData.page,
          end: this.scanBufferTempData.page
        },
        data_speaker: ""
      };
      console.log("> save buffer between threads ...", "p" + result.scanrange.start + " to p" + result.scanrange.end, pre.shorten(result.content));
      this.emit('scanpage', this.finalizeResultObject(result));
      this.scanBufferTempData = {};
      callback();
    }
  }
};
pdfminingV7.prototype.proc_context_type = function (context) {
  var chuck_result = {};
  if (!pre.l.isEmpty(this.scanBufferTempData)) {
    const result = {
      content: this.scanBufferTempData.text,
      metadata: [this.getExt().data_bill_title, this.getExt().data_internal_key],
      page: this.scanBufferTempData.page,
      scanrange: {
        start: this.scanBufferTempData.page,
        end: this.scanBufferTempData.page
      },
      data_speaker: ""
    };
    console.log("> save buffer between threads ...", "p" + result.scanrange.start + " to p" + result.scanrange.end, pre.shorten(result.content));
    this.emit('scanpage', this.finalizeResultObject(result));
    this.scanBufferTempData = {};
  }
  chuck_result = pre.chuckString(context, 500);
  this.scanBufferTempData = {
    text: context.substring(chuck_result.last, -1),
    page: this.options.to
  };
  pre.l.forEach(chuck_result.chucks, function (item) {
    const result = {
      content: item,
      metadata: [this.getExt().data_bill_title, this.getExt().data_internal_key],
      page: this.options.from,
      scanrange: {
        start: this.options.from,
        end: this.options.from
      },
      data_speaker: ""
    };
    console.log("> main buffer.", "p" + result.scanrange.start + " to p" + result.scanrange.end, pre.shorten(result.content));
    this.emit('scanpage', this.finalizeResultObject(result));
  }.bind(this));

  this.next_wave();
};
pdfminingV7.prototype.updateScanPageConfigSinglePage = function (pagenum) {
  this.options.from = pagenum;
  this.options.external.from = pagenum;
  this.options.to = pagenum;
  this.options.external.to = pagenum;
  console.log("start scan classic doc. pages from p" + pagenum + " to p" + pagenum, "max pages:" + this.maxpages);
};
pdfminingV7.prototype.next_wave = function () {
  console.log("> next_wave: different page next wave ...");
  if ((parseInt(this.options.to) + 1) <= this.maxpages) {
    this.updateScanPageConfigSinglePage(parseInt(this.options.to) + 1);
    this.process_pages();
  } else {
    this.resolve_last_buffer(function () {
      this.emit("complete", "resolve_last_buffer");
    }.bind(this));
  }
};
module.exports = new pdfminingV7();