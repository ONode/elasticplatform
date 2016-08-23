/**
 * Created by zJJ on 8/12/2016.
 * XDPF Util
 */
"use strict";
const
  util = require("util"),
  xpdfUtil = require("pdf-util"),
  cpdfUtil = require("cpdf-n"),
  _ = require("lodash"),
  events = require("events"),
  spmap = require("./ppmap.json");

const options_instance = {
  interval_pages: 15,
  remove_space_asian_character: false,
  new_paragraph: false,
  remove_single_n_english: false,
  from: 0,
  to: 10
};

const regtool = {
  bookmark: /(SP_[A-Z][A-Z]_[A-Z]+_)\w+/g,
  page: /\b\d{1,}/g,
  tag_name: /SP_[A-Z][A-Z]_\w+_/g,
  bookmark_meeting_process: /b\d\w+/g,
  post_process_extraction: ''
};

const cxpdfnMining = function (config) {
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
  this.index_trail = [];
  this.iterate = 0;
  //console.log("=== pdf to text ===");
  // console.log(this);
  this.settings(config);
  //console.log("=== pdf to settings ===");
};
//must follow this order now
util.inherits(cxpdfnMining, events);
function test_array(arrayList) {
  var list = arrayList[0].split("\n1");
  console.log('> display all.. ', list);
  var test_item_index = 15;
  var r1 = list[test_item_index].match(regtool.bookmark);
  var r2 = list[test_item_index].match(regtool.page);
  var r3 = list[test_item_index].match(regtool.bookmark_meeting_process);
  console.log('> display item ', list[test_item_index]);
  console.log('> display matches.. ', r1);
  if (!_.isEmpty(r1[0]) && !_.isEmpty(r2[0])) {
    console.log('> display match bookmark tag', r1[0]);
    console.log('> display match bookmark page', r2[0]);
    var page = r2[0], bookmark = r1[0];
  }
}
function ArrNoDupe(a) {
  var temp = {};
  for (var i = 0; i < a.length; i++)
    temp[a[i]] = true;
  var r = [];
  for (var k in temp)
    r.push(k);
  return r;
}
cxpdfnMining.prototype.bookmarks_analyzer = function (raw_cpdf_bookmarks) {
  console.log('> is array', _.isArray(raw_cpdf_bookmarks));
  console.log('> count', raw_cpdf_bookmarks.length);
  var
    list = raw_cpdf_bookmarks[0].split("\n1"),
    previous_index_page = -1,
    n = 0,
    name_arr = [];

  _.forEach(list, function (item_name) {

    const r2 = item_name.match(regtool.page);
    const r1 = item_name.match(regtool.bookmark);
    const r3 = item_name.match(regtool.bookmark_meeting_process);

    try {

      if (r1 == null && r3 == null || r2 == null) {
        // console.log('>>> is list n', n);
        return;
      }

      const pageindex = parseInt(r2[0]);
      var bookmark = '', real_tag = '';

      //console.log('>>> is list', item_name);

      if (r3 != null) {
        bookmark = r3[0];
        real_tag = bookmark;
      } else if (r1 != null) {
        bookmark = r1[0];
        var tag_name = bookmark.match(regtool.tag_name);
        var r4 = new String(tag_name[0]);
        real_tag = r4.substr(0, r4.length - 1).toUpperCase();
      } else {
        console.error("no case found error");
        return;
      }

      const index_base = {
        tag: real_tag,
        page: pageindex,
        bookmark_tag: bookmark,
        scanrange: {
          start: pageindex,
          end: 0
        }
      };

      if (previous_index_page == -1) {
        index_base.scanrange.end = pageindex;
      } else if (previous_index_page == pageindex) {
        index_base.scanrange.end = pageindex;
      } else if (pageindex > previous_index_page) {
        //var delta = pageindex - previous_index_page;
        //  console.log('index n: ', n);
        //  console.log('delta : ', delta);
        this.index_trail[n - 1].scanrange.end = pageindex;
        // console.log('d object : ', this.index_trail[n - 1]);
        index_base.scanrange.end = pageindex;
        //  console.log(index_base);
      } else {
        console.error("no such page error!!!!!!!!!!!!");
      }
      previous_index_page = pageindex;
      if (n == 0) {
        // console.log('> first json', index_base);
      }
      name_arr.push(real_tag);
      this.index_trail.push(index_base);
      n++;
      //  console.error("no errore");
    } catch (e) {
      //  console.error(e);
      previous_index_page = -1;
    }
    name_arr = ArrNoDupe(name_arr);
    // console.log('> final name tags', name_arr);
  }.bind(this));
};

cxpdfnMining.prototype.start = function () {
  cpdfUtil.listBookmarks(this.filepath).then(function (arrayList) {
    this.bookmarks_analyzer(arrayList);
  }.bind(this)).then(function () {
    console.log('> start the first page', this.index_trail[0].page);
    // console.log('> list objects', this.index_trail);
    xpdfUtil.info(this.filepath, function (err, info) {
      if (err) throw(err);
      console.log("=== log info ===");
      console.log(info);
      console.log("================");
      this.startScanConfigAt(this.iterate);
      this.process_pages();
    }.bind(this));
  }.bind(this));
};

cxpdfnMining.prototype.settings = function (config) {
  this.options.external = config;
};

cxpdfnMining.prototype.startScanConfigAt = function (inter) {
  this.options.from = this.index_trail[inter].scanrange.start;
  this.options.to = this.index_trail[inter].scanrange.end;
  this.options.external.from = this.index_trail[inter].scanrange.start;
  this.options.external.to = this.index_trail[inter].scanrange.end;
  // this.options.total_pages = maxpages;
};

cxpdfnMining.prototype.getCurrentScanningItem = function () {
  return this.index_trail[this.iterate];
};
cxpdfnMining.prototype.getNextScanningIndex = function () {
  return this.index_trail[this.iterate + 1];
};

cxpdfnMining.prototype.getConfig = function () {
  return this.options;
};

cxpdfnMining.prototype.getExternal = function () {
  return this.options.external;
};

cxpdfnMining.prototype.next_wave = function () {
  if (this.index_trail.length > this.iterate) {
    this.iterate = this.iterate + 1;
    this.process_pages();
  } else {
    this.emit('complete', 'done');
  }

  /* var delta = this.getConfig().total_pages - this.getConfig().to;
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
   }*/
};

cxpdfnMining.prototype.gc = function () {
  if (global.gc) {
    global.gc();
  } else {
    console.warn('No GC hook! Start your program as `node --expose-gc file.js`.');
  }
};

cxpdfnMining.prototype.process_pages = function () {
  /* this.options.exeOrder_1 = function (line) {
   //console.log('> check in', line);
   return line;
   };
   */
  // console.log('> set trail index ', this.iterate);
  // console.log('> set trail display', this.index_trail[this.iterate]);
  // console.log('> set options', this.options);
  //return;

  xpdfUtil.pdfToText(this.filepath, this.options, function (err, data) {
    if (err) {
      console.log("=== error form pdfToText ===");
      console.log("out", err);
      this.emit("error", err.message);
      this.next_wave();
      return;
    }

    const pre_capture_context = new String(data);
    const cur_item_tag = this.getCurrentScanningItem().tag;
    var cur_dim_possible = _.has(spmap, cur_item_tag);

    //console.log("first tag is found", cur_dim_possible);
    if (cur_dim_possible) {
      const next_item_tag = this.getNextScanningIndex().tag;
      var next_dim_possible = _.has(spmap, next_item_tag);
      var b1_token = _.get(spmap, [cur_item_tag, "full"]), b2_token;
      var b1 = pre_capture_context.indexOf(b1_token) + b1_token.length, b2 = -1;
      if (next_dim_possible) {
        b2_token = _.get(spmap, [next_item_tag, "full"]);
        b2 = pre_capture_context.indexOf(b2_token);
      }

      const captured = pre_capture_context.substring(b1, b2),
        result = {
          content: captured,
          title: "",
          metadata: [],
          tag: cur_item_tag,
          page: this.getCurrentScanningItem().page,
          bookmark_tag: this.getCurrentScanningItem().bookmark_tag,
          scanrange: {
            start: this.getCurrentScanningItem().scanrange.start,
            end: this.getCurrentScanningItem().scanrange.end
          }
        };

      console.log("> precapture order: ", b1, b2, captured);
      //console.log("> precapture order: ", b1, b2, pre_capture_context);
      console.log("> tag name: ", cur_item_tag, next_item_tag);
      console.log("> tag name actual: ", b1_token, b2_token);
      result.data_internal_key = this.getExternal().data_internal_key;
      result.data_read_order = this.getExternal().data_read_order;
      result.data_source_url = this.getExternal().url;

      this.emit('scanpage', result);
      /* if (data.length > 0) {
       console.log("now processed pages: " + this.getConfig().from + " - " + this.getConfig().to);
       this.emit('scanpage', result);
       } else {
       this.next_wave();
       }
       */
    } else {
      console.error(". tag cant map", "no dictionary map can be found by,", cur_item_tag);
    }


  }.bind(this));
};


module.exports = cxpdfnMining;