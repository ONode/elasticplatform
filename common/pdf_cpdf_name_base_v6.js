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
//"node-scws": "~0.0.1",
//scws = require("scws"),
const options_instance = {
  interval_pages: 15,
  remove_space_asian_character: false,
  new_paragraph: false,
  remove_single_n_english: false,
  only_preindex: false,
  from: 0,
  to: 10
};

const regtool = {
  bookmark: /(SP_[A-Z][A-Z]_[A-Z]+_)\w+/g,
  bookmark_old_style: /(SP_[A-Z][A-Z]_[A-Z]+_)\w+/g,
  page: /\b\d{1,}/g,
  tag_name: /SP_[A-Z][A-Z]_\w+_/g,
  bookmark_meeting_process: /b\d\w+/g,
  post_process_extraction: '',
  tag_extract_name_person: /[\u4e00-\u9fa5]+[^\uff1a]/g
};

const cxpdfnMining = function (config) {
  events.call(this);
  this.options = options_instance;
  this.filepath = config.out;
  if (_.isBoolean(config.isEnglish) && config.isEnglish) {
    this.options.remove_space_asian_character = false;
    this.options.new_paragraph = true;
    this.options.remove_single_n_english = true;
  } else {
    this.options.remove_space_asian_character = true;
    this.options.new_paragraph = true;
    this.options.remove_single_n_english = false;
  }
  if (_.isBoolean(config.only_preindex) && config.only_preindex) {
    this.options.only_preindex = true;
  }
  this.index_trail = [];
  this.iterate = 0;
  this.pdf_type = -1;
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

function xUtilIndexHelper(name_arr, pointerIndexFullSet, exclude_existing_json) {
  var unqi = ArrNoDupe(name_arr);
  var showlist = [];
  _.forEach(unqi, function (tag_name) {
    if (exclude_existing_json && !_.has(spmap, tag_name)) {
      _.forEach(pointerIndexFullSet, function (obit) {
        if (tag_name == obit.tag) {
          showlist.push({
            "tag": tag_name,
            "page": obit.page
          });
          return false;
        }
      });
    }
  });
  console.log('> =====================================.');
  console.log('> ======= pre-index miner page=======.');
  console.log('> ===================================.');
  console.log('> final name tags', showlist);
  console.log('> ===========================.');
}


cxpdfnMining.prototype.bookmarks_analyzer = function (raw_cpdf_bookmarks) {
  console.log('> is array', _.isArray(raw_cpdf_bookmarks));
  console.log('> count', raw_cpdf_bookmarks.length);
  // console.log('> preview', raw_cpdf_bookmarks);
  var
    t1 = raw_cpdf_bookmarks[0], t2 = raw_cpdf_bookmarks[1],
    list = raw_cpdf_bookmarks[0].split("\n1"),
    previous_index_page = -1,
    n = 0,
    name_arr = [];

  if (_.isEmpty(t1) && _.isEmpty(t2)) {
    console.error("there are no bookmarks from this PDF");
    return;
  }
  //console.log('>>> is list', list);
  _.forEach(list, function (item_name) {

    const r2 = item_name.match(regtool.page);
    const r1 = item_name.match(regtool.bookmark);
    const r5 = item_name.match(regtool.bookmark_old_style);
    const r3 = item_name.match(regtool.bookmark_meeting_process);

    try {

      if (r2 != null && (r1 != null || r3 != null)) {
        // console.log('>>> detect the new type pdf', n);
        this.pdf_type = 2;
      } else if (r5 != null && r2 == null) {
        // console.log('>>> detect the old type pdf', n);
        this.pdf_type = 1;
      } else {
        // console.log('>>> too old cannot be index', n);
        this.pdf_type = 0;
        throw new Error("pdf format is too old");

      }

      const pageindex = parseInt(r2[0]);
      // console.log('>> page number', pageindex);

      var bookmark = '', real_tag = '';
      //  console.log('>>> is list', item_name);
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
      //console.error(e);
      previous_index_page = -1;
    }
  }.bind(this));
  if (this.options.only_preindex) {
    xUtilIndexHelper(name_arr, this.index_trail, true);
    console.log('>> ====== > pdf detection', this.pdf_type);
  }
};
cxpdfnMining.prototype.start = function () {
  cpdfUtil.listBookmarks(this.filepath).then(function (arrayList) {
    this.bookmarks_analyzer(arrayList);
  }.bind(this), function (error) {
    console.log('pdf error', error);
  }).then(function () {
    console.log('> start the first page', this.index_trail[0].page);
    // console.log('> list objects', this.index_trail);
    xpdfUtil.info(this.filepath, function (err, info) {
      if (err) throw(err);


      if (this.options.only_preindex) {
        this.emit('complete', 'done');
      } else {

        console.log("=== log info ===");
        console.log(info);
        console.log("================");

        this.startScanConfigAt(this.iterate);
        this.process_pages();
      }

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

      const captured = pre_capture_context.substring(b1, b2);
      console.log("> precapture order: ", b1, b2, captured);
      const chinese_name = b1_token.match(regtool.tag_extract_name_person);
      const name_tag = chinese_name[0] == null ? cur_item_tag : chinese_name[0];
      /*
       wordfreq.process(captured).getList(function (list) {
       console.log("> list opt- ", list);
       //console.log('process: ', 'adasda');
       }).empty(function () {
       console.log("> empty list ");
       });
       console.log("> end and no discovery");
       */

      // console.log('process: ', 'cascasc');


      /*var mScws = new scws.init({
       ignorePunct: false,
       multi: "short",
       dicts: "./dicts/dict.utf8.xdb",
       rule: "./rules/rules.utf8.ini"
       });*/
      //var chopchop = mScws.segment(captured);
      //mScws.destroy();

      const result = {
        content: captured,
        title: "h-" + this.getCurrentScanningItem().page,
        metadata: [name_tag],
        tag: name_tag,
        page: this.getCurrentScanningItem().page,
        bookmark_tag: this.getCurrentScanningItem().bookmark_tag,
        scanrange: {
          start: this.getCurrentScanningItem().scanrange.start,
          end: this.getCurrentScanningItem().scanrange.end
        }
      };

      //console.log("> precapture order: ", b1, b2, pre_capture_context);
      //console.log("> tag name: ", cur_item_tag, next_item_tag);
      // console.log("> tag name actual: ", b1_token, b2_token);
      //console.log("> tag name word list: ", b1_token, chopchop);
      result.data_internal_key = this.getExternal().data_internal_key;
      result.data_read_order = this.getExternal().data_read_order;
      result.data_source_url = this.getExternal().url;


      this.emit('scanpage', result);


      //console.log("> list opt- ", list);
    } else {
      console.error(". tag cant map", "no dictionary map can be found by,", cur_item_tag);
      this.next_wave();

    }

  }.bind(this));

};


module.exports = cxpdfnMining;