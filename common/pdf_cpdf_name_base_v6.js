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
  dateFormat = require('dateformat'),
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
  tag_name_old: /SP_[A-Z][A-Z]_\w+/g,
  bookmark_meeting_process: /b\d\w+/g,
  post_process_extraction: '',
  tag_extract_name_person: /[\u4e00-\u9fa5]+[^\uff1a]/g
};
var end_use_marker = ["？", "。", "）", "......"];
var es_end = "》";
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
  this.scanpagesbuffer = 0;
  this.maxpages = 0;
  this.scanBufferTempData = {};
  this.document_date = "";
  //console.log("=== pdf to text ===");
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

function nameTag(object_tag) {
  const chinese_name = object_tag.token.match(regtool.tag_extract_name_person);
  const name_tag = chinese_name[0] == null ? "**NOT FOUND**" : chinese_name[0];
  return name_tag;
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
    this.pdf_type = 0;
    console.log("there are no bookmarks from this PDF, continue with type zero analysis");
  } else {
    console.log("bookmarks found");
    //console.log('>>> is list', list);
    _.forEach(list, function (item_name) {

      const r2 = item_name.match(regtool.page);
      const r1 = item_name.match(regtool.bookmark);
      const r5 = item_name.match(regtool.bookmark_old_style);
      const r3 = item_name.match(regtool.bookmark_meeting_process);

      try {

        if (r2 != null && (r1 != null || r3 != null)) {
          //  console.log('>>> detect the new type pdf', n);
          this.pdf_type = 2;
        } else if (r5 != null && r2 == null) {
          // console.log('>>> detect the old type pdf', n);
          //this.pdf_type = 1;
        } else {
          //console.log('>>> error cannot be index', n);
          //this.pdf_type = 0;
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

        if (real_tag == null) {
          console.error("real_tag is null");
          console.log('>>> is list', item_name);
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
        //console.log('> first json', index_base);
        name_arr.push(real_tag);
        this.index_trail.push(index_base);
        n++;
        //  console.error("no errore");
      } catch (e) {
        //console.error(e);
        previous_index_page = -1;
      }
    }.bind(this));
    // this.options.only_preindex = true;
    if (this.options.only_preindex) {
      xUtilIndexHelper(name_arr, this.index_trail, true);
      console.log('>> ====== > pdf detection', this.pdf_type);
    }

  }
};
cxpdfnMining.prototype.start = function () {
  cpdfUtil.listBookmarks(this.filepath).then(function (arrayList) {
    this.bookmarks_analyzer(arrayList);
  }.bind(this), function (error) {
    console.log('pdf error', error);
  }).then(function () {
    // console.log('> start the first page', this.index_trail[0].page);
    // console.log('> list objects', this.index_trail);
    xpdfUtil.info(this.filepath, function (err, info) {
      if (err) throw(err);
      if (this.options.only_preindex) {
        this.emit('complete', 'done');
      } else {

        console.log("=== log info ===");
        console.log(info);
        console.log("================");

        var nowdate = parseInt(info.creationdate);
        this.document_date = dateFormat(nowdate, "isoDateTime");
        this.maxpages = parseInt(info.pages);
        if (this.pdf_type == 2) {
          this.startScanConfigAtNode(this.iterate);
          this.process_pages();
        } else if (this.pdf_type == 0) {
          this.startScanConfigAtOldStyle(1);
          this.process_pages();
        }
      }

    }.bind(this));
  }.bind(this));
};

cxpdfnMining.prototype.settings = function (config) {
  this.options.external = config;
};

cxpdfnMining.prototype.startScanConfigAtNode = function (inter) {
  //console.log("total nodes ", this.index_trail.length, inter);
  if (inter == this.index_trail.length) {
    return false;
  }
  if (_.isNull(this.index_trail[inter])) {
    return false;
  }
  this.iterate = inter;
  this.options.from = this.index_trail[inter].scanrange.start;
  this.options.to = this.index_trail[inter].scanrange.end;
  this.options.external.from = this.index_trail[inter].scanrange.start;
  this.options.external.to = this.index_trail[inter].scanrange.end;
  return true;
  // this.options.total_pages = maxpages;
};
cxpdfnMining.prototype.startScanConfigAtOldStyle = function (pagenum) {
  this.options.from = pagenum;
  this.options.external.from = pagenum;
  this.options.to = pagenum;
  this.options.external.to = pagenum;
  console.log("set page", pagenum);
};
cxpdfnMining.prototype.next_wave = function () {
  if (this.pdf_type == 2) {
    console.log('pdf type is starting at two');
    if (this.startScanConfigAtNode(this.iterate + 1)) {
      this.process_pages();
    } else {
      this.emit('complete', 'done');
    }
  } else if (this.pdf_type == 0) {
    console.log('next wave process now', this.maxpages, this.options.to);
    if (this.maxpages > (parseInt(this.options.to) + 1)) {
      this.startScanConfigAtOldStyle(parseInt(this.options.to) + 1);
      this.process_pages();
    } else {
      this.emit('complete', 'done');
    }
  }
};
/*cxpdfnMining.prototype.scan_one_more_page = function () {
 this.scanpagesbuffer++;
 this.options.to = this.options.from + this.scanpagesbuffer;
 this.options.external.to = this.options.external.from + this.scanpagesbuffer;
 this.process_pages();
 };*/
cxpdfnMining.prototype.getCurrentScanningItem = function () {
  return this.index_trail[this.iterate];
};
cxpdfnMining.prototype.getNextScanningIndex = function () {
  return this.index_trail[this.iterate + 1];
};
cxpdfnMining.prototype.hasNextNode = function () {
  return this.iterate + 1 != this.index_trail.length;
//  return !_.isNull(this.index_trail[this.iterate + 1]);
};
cxpdfnMining.prototype.getConfig = function () {
  return this.options;
};

cxpdfnMining.prototype.getExternal = function () {
  return this.options.external;
};
cxpdfnMining.prototype.gc = function () {
  if (global.gc) {
    global.gc();
  } else {
    console.warn('No GC hook! Start your program as `node --expose-gc file.js`.');
  }
};
cxpdfnMining.prototype.process_nowadays = function (pre_capture_context) {
  try {
    //  const flag_cur = _.has(this.getCurrentScanningItem(), "tag");
    const cur_item_tag = this.getCurrentScanningItem().tag;
    var cur_dim_possible = _.has(spmap, cur_item_tag);
    //console.log("first tag is found", cur_dim_possible);

    if (cur_dim_possible && cur_item_tag != null) {
      var b1_token = _.get(spmap, [cur_item_tag, "full"]), b2_token;
      var b1 = pre_capture_context.indexOf(b1_token) + b1_token.length, b2 = -1;
      var rest_sentence = pre_capture_context.substring(b1, pre_capture_context.length);
      if (this.hasNextNode()) {
        //console.log("has next node");
        const next_item_tag = this.getNextScanningIndex().tag;
        var next_dim_possible = _.has(spmap, next_item_tag);
        b2_token = _.get(spmap, [next_item_tag, "full"]);
        b2 = rest_sentence.indexOf(b2_token);
        if (b2 == -1 && next_dim_possible) {
          _.forEach(spmap, function (object) {
            var h2 = rest_sentence.indexOf(object.full);
            if (h2 > -1) {
              b2 = h2;
              console.log("found tag position: " + object.full, h2);
              return false;
            }
          });
          if (b2 == -1) {
            b2 = pre_capture_context.length;
            if (b2 == -1) {
              console.log("> stop for token review: ", b1, b2, b1_token, b2_token);
              return;
            }
          }
        }
      } else {
        console.log("does not have next node");

        _.forEach(spmap, function (object) {
          var h2 = rest_sentence.lastIndexOf(object.full);
          if (h2 > -1) {
            b2 = h2;
            console.log("found tag position: " + object.full, h2);
            return false;
          }
        });
        if (b2 == -1) {

          _.forEach(end_use_marker, function (mark) {
            var v2 = rest_sentence.lastIndexOf(mark);
            if (v2 > -1) {
              b2 = v2;
              console.log("found mark position: " + mark, v2);
              return false;
            }
          });
          if (b2 == -1) {
            b2 = pre_capture_context.length;
            console.log("found nothing: ", b2);
            if (b2 == -1) {
              console.log("> stop for token review: ", b1, b2, b1_token);
              return;
            }
          }
        }
      }

      // console.log("> stop for token review: ", b1, b2, b1_token, b2_token);
      const cap_end = b1 + b2;
      const captured = pre_capture_context.substring(b1, cap_end);

      const chinese_name = b1_token.match(regtool.tag_extract_name_person);
      const name_tag = chinese_name[0] == null ? "**NOT FOUND**" : chinese_name[0];

      //   console.log("> capture extract: " + name_tag, "page:" + this.options.from, b1, cap_end, captured.length);
      //  console.log("> capture content: ", captured);

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
       rule: "./rules/rules.utf8.ini";
       });*/
      //var chopchop = mScws.segment(captured);
      //mScws.destroy();

      //console.log("> content: ", pre_capture_context);

      const result = {
        content: captured,
        title: name_tag + " p" + this.getCurrentScanningItem().page,
        metadata: [name_tag],
        page: this.getCurrentScanningItem().page,
        bookmark_tag: this.getCurrentScanningItem().bookmark_tag,
        scanrange: {
          start: this.getCurrentScanningItem().scanrange.start,
          end: this.getCurrentScanningItem().scanrange.end
        }
      };
      //console.log("> precapture order: ", b1, b2, pre_capture_context);
      //console.log("> tag name: ", cur_item_tag, next_item_tag);
      //console.log("> tag name actual: ", b1_token, b2_token);
      //console.log("> tag name word list: ", b1_token, chopchop);
      result.data_internal_key = this.getExternal().data_internal_key;
      result.data_read_order = this.getExternal().data_read_order;
      result.data_source_url = this.getExternal().url;
      this.emit('scanpage', result);
    } else {
      console.error(". tag cant map", "no dictionary map can be found by,", cur_item_tag);
      this.next_wave();
    }
  } catch (e) {
    console.error(e);
    console.log("error", "see technical issue");
    //this.next_wave();
  }
};
cxpdfnMining.prototype.get_map_list = function (data) {
  var exclude = "列席秘書：";
  var map_list = [];
  var start_from = 0;
  var loop = true;
  while (loop) {
    loop = false;
    _.forEach(spmap, function (object) {
      var h2 = data.indexOf(object.full, start_from);
      if (object.full == "秘書：") {
        var m1 = data.indexOf(exclude, start_from);
        var m2 = data.indexOf(object.full, start_from);
        if (m1 > -1) {
          h2 = -1;
        } else {
          h2 = m2;
        }
      } else {
        h2 = data.indexOf(object.full, start_from);
      }
      if (h2 > -1) {
        start_from = h2 + object.full.length;
        map_list.push({
          page: this.options.from,
          index: h2,
          token: object.full,
          person: true
        });
        loop = true;
        return false;
      }
    }.bind(this));
  }
  // console.log("indicators", map_list);
  return map_list;
};
cxpdfnMining.prototype.process_smart_mapping = function (pre_capture_context) {
  var mapList_1 = this.get_map_list(pre_capture_context), captured, loop = true;
  if (mapList_1.length >= 2) {
    //got the record indexed;
    var p = 0;
    this.continue_resolve_buffer_object(mapList_1[0], pre_capture_context);
    while (loop) {
      if (p < (mapList_1.length - 1)) {
        var k1 = mapList_1[p].index + mapList_1[p].token.length;
        var k2 = mapList_1[p + 1].index;

        captured = pre_capture_context.substring(k1, k2);
        const name_tag = nameTag(mapList_1[p]);
        const result = {
          content: captured,
          title: name_tag + " p" + this.options.from,
          metadata: [name_tag],
          page: this.options.from,
          scanrange: {
            start: this.options.from,
            end: this.options.to
          },
          thread_date: this.document_date
        };
        // console.log("> precapture order: ", k1, k2, pre_capture_context);

        result.data_internal_key = this.getExternal().data_internal_key;
        result.data_read_order = this.getExternal().data_read_order;
        result.data_source_url = this.getExternal().url;
        this.emit('scanpage', result);

        console.log("> tag name: ", name_tag, ": ", captured);

        p++;
      } else if (p == mapList_1.length - 1) {
        var k1 = mapList_1[p].index + mapList_1[p].token.length;
        var last_mark_index_k2 = -1;
        _.forEach(end_use_marker, function (mark) {
          var v2 = pre_capture_context.lastIndexOf(mark);
          if (v2 > -1) {
            if (v2 > last_mark_index_k2) {
              last_mark_index_k2 = v2;
              //   console.log("new found mark position: " + mark, v2);
            }
          }
        });
        const name_tag = nameTag(mapList_1[p]);
        if (pre_capture_context.length - 1 > last_mark_index_k2) {
          console.log("sentence incomplete");
          //the last one is in here
          this.scanBufferTempData = {
            last_tag_name: name_tag,
            last_incomplete_sentence: pre_capture_context.substring(k1, pre_capture_context.length),
            from_page: this.options.from
          }
        } else {
          console.log("sentence complete");
          captured = pre_capture_context.substring(k1, last_mark_index_k2);
          console.log("> precapture order: ", k1, last_mark_index_k2, pre_capture_context);
          console.log("> tag name: ", name_tag, captured);
          this.scanBufferTempData = {};
        }
        loop = false;
      } else {
        console.log("no further process: no next loop");
        loop = false;
      }
    }
    this.next_wave();
  } else if (mapList_1.length == 1) {
    //scan next page and scan this page
    console.log('only one item is found: ', pre_capture_context);
    const theOnlyObj = mapList_1[0];
    this.continue_resolve_buffer_object(theOnlyObj, pre_capture_context);
    this.scanBufferTempData = {
      last_tag_name: nameTag(theOnlyObj),
      last_incomplete_sentence: pre_capture_context.substring(k1, pre_capture_context.length),
      from_page: this.options.from
    };
    this.next_wave();
  } else {
    //go ahead and scan the next page
    this.next_wave();
  }
};
cxpdfnMining.prototype.continue_resolve_buffer_object = function (map_list_object, raw_data) {
  const name = nameTag(map_list_object);
  if (!_.isEmpty(this.scanBufferTempData)) {
    const result = {
      content: this.scanpagesbuffer.last_incomplete_sentence + raw_data.substring(0, map_list_object.index),
      title: name + " p" + this.scanpagesbuffer.from_page,
      metadata: [name],
      page: this.scanpagesbuffer.from_page,
      scanrange: {
        start: this.scanpagesbuffer.from_page,
        end: this.options.to
      },
      thread_date: this.document_date
    };
    result.data_internal_key = this.getExternal().data_internal_key;
    result.data_read_order = this.getExternal().data_read_order;
    result.data_source_url = this.getExternal().url;
    console.log("> tag name: ", result.metadata, ": ", result.content);
    this.emit('scanpage', result);
  }
};
cxpdfnMining.prototype.process_pages = function () {
  // console.log('> set trail index ', this.iterate);
  // console.log('> set trail display', this.index_trail[this.iterate]);
  // console.log('> set options', this.options);
  xpdfUtil.pdfToText(this.filepath, this.options, function (err, data) {
    if (err) {
      console.log("=== error form pdfToText ===");
      console.log("out", err);
      this.emit("error", err.message);
      this.next_wave();
      return;
    }
    const raw_dat = new String(data);
    if (this.pdf_type == 2) {
      this.process_nowadays(raw_dat);
    } else {
      this.process_smart_mapping(raw_dat);
    }
  }.bind(this));
};


module.exports = cxpdfnMining;