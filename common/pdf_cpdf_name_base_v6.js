/**
 * Created by zJJ on 8/12/2016.
 * XDPF Util
 */
"use strict";
const
  util = require("util"),
  _ = require("lodash"),
  pdfminer = require("./pdfminer.js"),
  xpdfUtil = require("pdf-util"),
  cpdfUtil = require("cpdf-n"),
  crackTool = require("./crackTool").crackTool,
  events = require("events"),
  dateFormat = require('dateformat'),
  mPersonnelDict_2008_2012 = require('./../data/personnel_2008_2012.json'),
  mInputPersonDictionary = require("./../data/ppmap.json");

const options_instance = {
  interval_pages: 15,
  remove_space_asian_character: false,
  new_paragraph: false,
  remove_single_n_english: false,
  only_preindex: false,
  from: 0,
  to: 10
};
String.prototype.replaceAll = function (search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
};
String.prototype.replaceAllReg = function (search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};
var fixPassageContentBugPass = function (context) {
  var
    b1 = context.match(crackTool.fix_bug_digit_char),
    b2 = context.match(crackTool.fix_bug_date_sub),
    b3 = context.match(crackTool.fix_bug_date_pre),
    b6 = context.match(crackTool.date_cn_extraction),
    b7 = context.match(crackTool.date_cn_extraction_v2),
    b4 = context.indexOf(")"),
    b5 = context.indexOf("("),
    out = context;
  if (b2 != null && b2.length > 0) {
    out = out.replace(crackTool.fix_bug_date_sub, "日");
  }
  if (b3 != null && b3.length > 0) {
    out = out.replace(crackTool.fix_bug_date_pre, "立法會");
  }
  if (b1 != null && b1.length > 0) {
    out = out.replace(crackTool.fix_bug_digit_char, "");
  }
  if (b4 > -1) {
    out = out.replaceAll(")", crackTool.name_mark[4]);
  }
  if (b5 > -1) {
    out = out.replaceAll("(", crackTool.name_mark[3]);
  }
  if (b6 != null && b6.length > 0) {
    out = out.replace(crackTool.date_cn_extraction, "");
  }
  if (b7 != null && b7.length > 0) {
    out = out.replace(crackTool.date_cn_extraction_v2, "");
  }
  return out;
};
var enphizis = function (person_name) {
  return crackTool.name_mark[0] + person_name + crackTool.name_mark[1];
};
function nameTag(object_tag) {
  const chinese_name = object_tag.token.match(crackTool.tag_extract_name_person);
  const name_tag = chinese_name[0] == null ? "**NOT FOUND**" : chinese_name[0];
  return name_tag;
};
var marker_x = function (text) {
  var last_mark_index_k2 = -1;
  _.forEach(crackTool.punctual_marks, function (mark) {
    var v2 = text.lastIndexOf(mark);
    if (v2 > -1) {
      if (v2 > last_mark_index_k2) {
        last_mark_index_k2 = v2;
      }
    }
  });
  return last_mark_index_k2;
};
var mark_multi = function (text) {
  var marks = [];
  _.forEach(crackTool.punctual_marks, function (mark) {
    marks.push(marker_indices(mark, text));
  });
  marks = _.flattenDeep(marks);
  return marks;
};
var sentence_marker_type2 = function (text, possible_index) {
  var end_document = text.length;
  // console.log("pageMode > 0.2.1", text);
  var possible_end = _.isNil(possible_index) ? -1 : possible_index.index;
  // console.log("pageMode > 0.2.1", text);
  var possible_end_mark = marker_x(text);
  var stop_marks = mark_multi(text);
  // console.log("pageMode > 0.2.2");
  var all_possible_collen = marker_indices(crackTool.name_mark[2], text);
  console.log("pageMode > 0.2.6");
  var possible_answer = [];
  var page_did_not_cover_the_last_thread = false;
  if (end_document > possible_end_mark) {
    page_did_not_cover_the_last_thread = true;
  }

  console.log("======marker test===========");
  console.log("possible_end_mark:", possible_end_mark);
  console.log("all_possible_collen:", all_possible_collen);
  console.log("possible:", possible_answer);
  console.log("possible end:", possible_end);
  console.log("stop marks:", stop_marks);
  console.log("page did not cover the last thread:", page_did_not_cover_the_last_thread);


  if (possible_end == -1 && possible_end_mark > -1) {
    return possible_end_mark;
  }

  if (all_possible_collen.length > 0 && stop_marks.length > 0 && possible_end > -1) {
    //var first_collen = Math.min(all_possible_collen);
    var full = [];
    _.forEach(all_possible_collen, function (colLoc) {
      _.forEach(stop_marks, function (stopLoc) {
        var delta = colLoc - stopLoc;
        if (delta > 0 && delta < 50 && stopLoc < possible_end) {
          full.push({
            stop: stopLoc,
            del: delta,
            col: colLoc
          });
        }
      });
    });
    var formindex = 0;
    if (possible_end > -1) {
      _.findIndex(full, function (o) {

      }, formindex);
    }
    console.log("position stops:", full);
    return possible_end;
  } else {
    return possible_end;
  }

  console.log("======marker test===========");
};
var shorten = function (context) {
  var char_len = 6;
  if (context.length > 30) {
    return context.substring(0, char_len) + crackTool.punctual_marks[4] + context.substring(context.length - char_len, context.length);
  } else {
    return context;
  }
};
Array.prototype.unique = function () {
  var o = {}, i, l = this.length, r = [];
  for (i = 0; i < l; i += 1) o[this[i]] = this[i];
  for (i in o) r.push(o[i]);
  return r;
};
var loadDictionary = function () {
  var arrayDict = [];
  _.forEach(mInputPersonDictionary, function (object) {
    arrayDict.push(new String(object.full + crackTool.name_mark[2]));
  });
  _.forEach(mPersonnelDict_2008_2012, function (personnel) {
    arrayDict.push(new String(personnel + crackTool.name_mark[2]));
  });
  arrayDict = arrayDict.unique();
  return arrayDict;
};
var ArrNoDupe = function (a) {
  var temp = {};
  for (var i = 0; i < a.length; i++)
    temp[a[i]] = true;
  var r = [];
  for (var k in temp)
    r.push(k);
  return r;
};

function xUtilIndexHelper(name_arr, pointerIndexFullSet, exclude_existing_json) {
  var unqi = ArrNoDupe(name_arr);
  var showlist = [];
  _.forEach(unqi, function (tag_name) {
    if (exclude_existing_json && !_.has(mInputPersonDictionary, tag_name)) {
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
  console.log('> ====================================.');
  console.log('> ======= pre-index miner page======.');
  console.log('> =================================.');
  console.log('> final name tags', showlist);
  console.log('> ===========================.');
}
/**
 * english use
 * @param searchStr
 * @param str
 * @param caseSensitive
 * @returns {Array}
 */
function getIndicesOfEn(searchStr, str, caseSensitive) {
  var searchStrLen = searchStr.length;
  if (searchStrLen == 0) {
    return [];
  }
  var startIndex = 0, index, indices = [];
  if (!caseSensitive) {
    str = str.toLowerCase();
    searchStr = searchStr.toLowerCase();
  }
  while ((index = str.indexOf(searchStr, startIndex)) > -1) {
    indices.push(index);
    startIndex = index + searchStrLen;
  }
  return indices;
}
/**
 * asian characters
 * @param mark as string
 * @param content_data as string
 * @returns {Array}
 */
var marker_indices = function (mark, content_data) {
  var markLen = mark.length;
  var str = new String(content_data);
  if (markLen == 0 || str.length == 0) {
    return [];
  }
  var startIndex = 0, index = -1, indices = [], loop = true;
  while (loop) {
    index = str.indexOf(mark, startIndex);
    if (index > -1) {
      startIndex = index + mark.length;
      indices.push(index);
    } else {
      loop = false;
    }
  }
  return indices;
};
var getEnhancedSentence = function (extract) {
  var end_mark = marker_x(extract);
  if (end_mark > -1 && end_mark < extract.length - 1) {
    return extract.substring(0, end_mark + 1);
  } else {
    return extract;
  }
};
var getTopic = function (extract) {
  var end_mark = marker_x(extract);
  if (end_mark > -1 && end_mark < extract.length - 1) {
    return extract.substring(end_mark, extract.length);
  } else {
    return "";
  }
};
var getIntervalInBetween = function (indices, position, context_data) {
  var start = indices[position].index + indices[position].token.length;
  var end = indices[position + 1].index;
  var extracted = context_data.substring(start, end);
  return getEnhancedSentence(extracted);
};

var getIntervalFromHead = function (indices, context_data) {
  const end = indices[0].index;
  var tr = context_data.substring(0, end);
  return getEnhancedSentence(tr);
};

var getIntervalAtEnd = function (indices, position, context_data) {
  var start = indices[position].index + indices[position].token.length;
  var tr = context_data.substring(start, context_data.length);
  return getEnhancedSentence(tr);
};
//must follow this order now
var cxpdfnMining = function () {
  /*if (false === (this instanceof cxpdfnMining)) {
   return new cxpdfnMining();
   }*/
  /* events.call(this);
   this.setMaxListeners(1);*/
};
util.inherits(cxpdfnMining, events);
cxpdfnMining.prototype.newInstance = function () {
  this.removeAllListeners("complete");
  this.removeAllListeners("error");
  this.removeAllListeners("scanpage");
  return new cxpdfnMining();
};
//do not change the order of this
cxpdfnMining.prototype.initNewConfig = function (config) {
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
  //modern trail items
  this.index_trail = [];
  this.iterate = 0;
  this.document_context = "";
  this.pdf_type = -1;
  this.maxpages = 0;
  this.scanBufferTempData = {};
  this.document_date = "";
  this.scan_error_check = [];

  //old style trail configuration
  this.flatten_dictionary = loadDictionary();
  //console.log("=== pdf to text ===");
  this.options.external = config;
  this.options.title = "";
};

function test_array(arrayList) {
  var list = arrayList[0].split("\n1");
  console.log('> display all.. ', list);
  var test_item_index = 15;
  var r1 = list[test_item_index].match(crackTool.bookmark);
  var r2 = list[test_item_index].match(crackTool.page);
  var r3 = list[test_item_index].match(crackTool.bookmark_meeting_process);
  console.log('> display item ', list[test_item_index]);
  console.log('> display matches.. ', r1);
  if (!_.isEmpty(r1[0]) && !_.isEmpty(r2[0])) {
    console.log('> display match bookmark tag', r1[0]);
    console.log('> display match bookmark page', r2[0]);
    var page = r2[0], bookmark = r1[0];
  }
}

cxpdfnMining.prototype.bookmarks_analyzer = function (raw_cpdf_bookmarks) {
  console.log('> is array', _.isArray(raw_cpdf_bookmarks));
  console.log('> list count', raw_cpdf_bookmarks.length);
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
    console.log("bookmarks found. try to index out the bookmarks");
    //console.log('>>> is list', list);
    _.forEach(list, function (item_name) {

      const r2 = item_name.match(crackTool.page);
      const r1 = item_name.match(crackTool.bookmark);
      const r5 = item_name.match(crackTool.bookmark_old_style);
      const r3 = item_name.match(crackTool.bookmark_meeting_process);

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
          var tag_name = bookmark.match(crackTool.tag_name);
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
          console.error("no such page error!!!");
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
cxpdfnMining.prototype.startDemo = function () {
  this.emit("complete", "star then the next test");
  return;
};
cxpdfnMining.prototype.pdfinfo = function () {
  xpdfUtil.info(this.filepath, function (err, info) {
    if (err) {
      console.log("error from getting the document info, and try again...", err);
      return;
    }
    if (this.options.only_preindex) {
      this.emit("complete", "this is the preindex only");
      return;
    }
    if (info == null) {
      this.pdfinfo();
      return;
    }
    console.log("=== log info ===");
    console.log(info);
    console.log("================");
    var nowdate = parseInt(info.creationdate);
    this.document_date = dateFormat(nowdate, "isoDateTime");
    this.maxpages = parseInt(info.pages);
    this.pdf_type = 3;
    this.iterate = 0;
    if (this.pdf_type == 2) {
      this.updateScanPageConfigAtNodeObject(this.iterate);
      this.process_pages_type2(1);
    } else if (this.pdf_type == 0) {
      this.updateScanPageConfigSinglePage(1);
      this.process_pages_type1();
    } else if (this.pdf_type == 3) {
      this.updateScanPageConfigSinglePage(1);
      this.process_pages_type3();
    }
  }.bind(this));
};
cxpdfnMining.prototype.start = function () {
  cpdfUtil.listBookmarks(this.filepath).then(function (arrayList) {
    this.bookmarks_analyzer(arrayList);
  }.bind(this), function (error) {
    console.log('pdf error', error);
  }).then(function () {
    this.pdfinfo();
  }.bind(this));
};
/**
 * 0: end of the document
 * 1: next scan in the same document
 * 2: next scan at the new document page
 * @param next
 * @returns {number}
 */
cxpdfnMining.prototype.updateScanPageConfigAtNodeObject = function (next) {
  //console.log("total nodes ", this.index_trail.length, next);
  if (next == this.index_trail.length) {
    //end of the document
    return 0;
  }
  if (_.isNull(this.index_trail[next]) || _.isEmpty(this.index_trail[next]) || _.isNaN(this.index_trail[next])) {
    //end of the document
    return 0;
  }

  var next_page_start = this.index_trail[next].scanrange.start;
  var next_page_end = this.index_trail[next].scanrange.end;
  var cur_page_start = this.index_trail[this.iterate].scanrange.start;

  this.options.from = next_page_start;
  this.options.external.from = next_page_start;

  var delta_next_page_start = Math.abs(next_page_start - cur_page_start);
  var delta_next_page_end = Math.abs(next_page_end - cur_page_start);
  var total_delta = Math.max(delta_next_page_start, delta_next_page_end);

  this.options.to = next_page_start + total_delta;
  this.options.external.to = next_page_start + total_delta;

  this.index_trail[next].scanrange.start = this.options.from;
  this.index_trail[next].scanrange.end = this.options.to;
  this.iterate = next;
  console.log("start scan type2 doc. max pages:" + this.maxpages + ", p" + this.options.from + " to p" + this.options.to);
  if (delta_next_page_start > 0 || delta_next_page_end > 0) {
    return 2;
  } else {
    return 1;
  }
};
cxpdfnMining.prototype.updateScanPageConfigSinglePage = function (pagenum) {
  this.options.from = pagenum;
  this.options.external.from = pagenum;
  this.options.to = pagenum;
  this.options.external.to = pagenum;
  console.log("start scan classic doc. pages from p" + pagenum + " to p" + pagenum, "max pages:" + this.maxpages);
};

cxpdfnMining.prototype.next_wave = function () {
  if (this.pdf_type == 2) {
    // console.log('pdf type is starting at two');
    var resultN = this.updateScanPageConfigAtNodeObject(this.iterate + 1);
    if (resultN == 0) {
      this.emit("complete", "doneTypeTwo");
    } else if (resultN == 1) {
      console.log("> next_wave: same page next wave ...");
      this.proc_context_type2(resultN);
    } else if (resultN == 2) {
      console.log("> next_wave: different page next wave ...");
      this.process_pages_type2(resultN);
    }
  } else if (this.pdf_type == 0) {
    console.log('next wave process now', this.options.to + "/" + this.maxpages);
    if (this.maxpages > (parseInt(this.options.to) + 1)) {
      this.updateScanPageConfigSinglePage(parseInt(this.options.to) + 1);
      this.process_pages_type1();
    } else {
      this.resolve_last_buffer(function () {
        this.emit("complete", "doneTypeZero");
      }.bind(this));
    }
  } else if (this.pdf_type == 3) {
    console.log('next wave process now', this.options.to + "/" + this.maxpages);
    if (this.maxpages > (parseInt(this.options.to) + 1)) {
      this.updateScanPageConfigSinglePage(parseInt(this.options.to) + 1);
      this.process_pages_type3();
    } else {
      this.resolve_last_buffer(function () {
        this.emit("complete", "doneType3");
      }.bind(this));
    }
  }
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
cxpdfnMining.prototype.finalizeResultObject = function (r) {
  r.data_internal_key = this.getExternal().data_internal_key || "";
  r.data_read_order = this.getExternal().data_read_order || "";
  r.data_source_url = this.getExternal().url;
  r.data_bill_title = this.getExternal().data_bill_title || "";
  return r;
};
cxpdfnMining.prototype.gc = function () {
  if (global.gc) {
    global.gc();
  } else {
    console.warn('No GC hook! Start your program as `node --expose-gc file.js`.');
  }
};
cxpdfnMining.prototype.save_extract_type2 = function (captured, name_tag, pageMode) {
  const result = {
    content: captured,
    metadata: [name_tag, this.getExternal().data_bill_title, this.getExternal().data_internal_key],
    page: this.getCurrentScanningItem().page,
    bookmark_tag: this.getCurrentScanningItem().bookmark_tag,
    scanrange: {
      start: this.getCurrentScanningItem().scanrange.start,
      end: this.getCurrentScanningItem().scanrange.end
    },
    data_speaker: name_tag
  };
  if (pageMode == 2) {
    console.log("cross pages reference.");
  }
  var cross_page_self = this.getCurrentScanningItem().scanrange.start != this.getCurrentScanningItem().scanrange.end;
  if (cross_page_self) {
    console.log("check cross page reference");
  }
  console.log("> save buffer between threads ...", "p" + result.scanrange.start + " to p" + result.scanrange.end, enphizis(name_tag), shorten(captured));
  this.emit('scanpage', this.finalizeResultObject(result));
};
cxpdfnMining.prototype.proc_context_type2 = function (pageMode) {
  try {
    console.log("pageMode > 0.1.0.0");
    const cur_item_tag = this.getCurrentScanningItem().tag;
    // console.log("proc_context_type2 complete: proc_context_type2");
    // console.log("pageMode > 0.1.0.1");
    var b1_token = _.get(mInputPersonDictionary, [cur_item_tag, "full"]), b2_token, captured = "";
    //var all_tags_positions = this.indexMetaList(this.document_context);
    // console.log("pageMode > 0.1.0.2");
    var b1 = this.document_context.indexOf(b1_token) + b1_token.length, b2 = -1, b3 = -1;
    //console.log("pageMode > 0.1.0.3");
    var chinese_name = b1_token.match(crackTool.tag_extract_name_person);
    // console.log("pageMode > 0.1.0.4");
    var name_tag = chinese_name[0] == null ? "**NOT FOUND**" : chinese_name[0];
    //  console.log("pageMode > 0.1.0.5");
    var rest_sentence = this.document_context.substring(b1, this.document_context.length);
    //is the next node in the same page?
    //there is not more node in the same page..
    if (pageMode > 0) {
      //   console.log("pageMode > 0.1");
      const next_item_tag = this.getNextScanningIndex().tag;
      //  console.log("pageMode > 0.2");
      //b2_token = _.get(mInputPersonDictionary, [next_item_tag, "full"]);
      b2 = sentence_marker_type2(rest_sentence, _.minBy(this.indexMetaList(rest_sentence), function (o) {
        return o.index;
      }));
      //  console.log("pageMode > 0.3");
      captured = this.document_context.substring(b1, b1 + b2);
      //  console.log("pageMode > 0.4");
      this.save_extract_type2(captured, name_tag, pageMode);
      //  console.log("pageMode > 0.5");
    } else {
      console.log("this is the end node.");
      this.save_extract_type2(this.document_context, name_tag, 0);
    }
    this.next_wave();
  } catch (e) {
    console.error(e);
    console.log("error", "occurred on proc_context_type2, please check and see technical issue");
    //--- this.next_wave();
  }
};
var take_out_conflicts = function (main_array, longer_token_with_col, short_token_ar, longer_token_ar) {
  /**
   * confusion for 商務及經濟發展局局長 and 發展局局長
   */
  if (longer_token_ar.length > 0 && short_token_ar.length > 0) {
    var b1 = longer_token_ar[0];
    var b2 = short_token_ar[0];
    var delta = b2 - b1;
    if (delta > 0 && delta < longer_token_with_col.length - 1) {
      _.remove(main_array, function (n) {
        return short_token_ar.indexOf(n.index) > -1;
      });
      console.log(">>>>>>  Remove item for - " + longer_token_with_col, longer_token_ar);
    }
  }
};
/**
 * this is the key part of the wild auto mapping system indicator
 * @param data
 * @returns {Array}
 */
cxpdfnMining.prototype.indexMetaList = function (data) {
  //var exclude = "列席秘書：";
  var main = [];
  var caseslot1 = [], caseslot2 = [], caseslot4 = [], caseslot5 = [], caseslot6 = [], caseslot7 = [];

  _.forEach(this.flatten_dictionary, function (mark_name) {
    var marks = _.sortedUniq(marker_indices(mark_name, data));
    // console.log("find names ", mark_name, marks);
    if (marks.length > 0) {
      if (mark_name == "商務及經濟發展局局長：") {
        caseslot1 = marks;
      }
      if (mark_name == "發展局局長：") {
        caseslot2 = marks;
      }
      /*if (mark_name == "秘書：") {
       compare_slot_3 = marks;
       ex = true;
       }*/
      if (mark_name == "全委會主席：") {
        caseslot4 = marks;

      }
      if (mark_name == "代理全委會主席：") {
        caseslot5 = marks;

      }
      if (mark_name == "主席：") {
        caseslot6 = marks;

      }
      if (mark_name == "代理主席：") {
        caseslot7 = marks;

      }

      _.forEach(marks, function (mark) {
        //  start_from = mark_1 + mark_name.length;
        main.push({
          page: this.options.from,
          index: mark,
          token: mark_name,
          person: true
        });
      }.bind(this));

    }
    //loop = true;
    //return false;
  }.bind(this));

  take_out_conflicts(main, "商務及經濟發展局局長：", caseslot2, caseslot1);
  take_out_conflicts(main, "代理全委會主席：", caseslot4, caseslot5);
  take_out_conflicts(main, "代理主席：", caseslot6, caseslot7);
  take_out_conflicts(main, "全委會主席：", caseslot6, caseslot4);

  var Lis = _.sortBy(main, [function (o) {
    return o.index;
  }]);
  //.unique();
  console.log("Indicators:", data, Lis);
  return Lis;
};
cxpdfnMining.prototype.resolve_last_buffer = function (callback) {
  if (!_.isEmpty(this.scanBufferTempData)) {
    const result = {
      content: this.scanBufferTempData.last_incomplete_sentence,
      metadata: [this.scanBufferTempData.last_tag_name],
      scanrange: {
        start: this.scanBufferTempData.from_page,
        end: this.options.to
      },
      thread_date: this.document_date,
      data_speaker: this.scanBufferTempData.last_tag_name
    };
    console.log("> save previous buffer last...", enphizis(this.scanBufferTempData.last_tag_name), shorten(result.content));
    this.emit('scanpage', this.finalizeResultObject(result));
    this.scanBufferTempData = {};
    console.log("complete all buffer fragments - last page");
    return callback();
  }
};
cxpdfnMining.prototype.resolve_buffer_context = function (indices, context_data) {
  if (!_.isEmpty(this.scanBufferTempData)) {
    if (this.scanBufferTempData.last_incomplete_sentence.length > 0) {
      if (indices.length > 0) {
        //start save previous passage
        const result = {
          content: this.scanBufferTempData.last_incomplete_sentence + getIntervalFromHead(indices, context_data),
          metadata: [this.scanBufferTempData.last_tag_name],
          scanrange: {
            start: this.scanBufferTempData.from_page,
            end: this.options.to
          },
          thread_date: this.document_date,
          data_speaker: this.scanBufferTempData.last_tag_name
        };
        console.log("> save previous buffer...", enphizis(this.scanBufferTempData.last_tag_name), shorten(result.content));
        //close buffer
        this.emit('scanpage', this.finalizeResultObject(result));
        //remove buffer data
        this.scanBufferTempData = {};
        //end save previous passage
      }
    }
  }

  if (_.isEmpty(this.scanBufferTempData)) {
    if (indices.length > 0) {
      var LastNameTag = nameTag(indices[indices.length - 1]);
      //the last one buffer passage
      var passage = getIntervalAtEnd(indices, indices.length - 1, context_data);
      //this should be the last statement and no buffer over..
      if (marker_x(context_data) == context_data.length - 1 && LastNameTag == "主席") {
        console.log("end mark...", marker_x(context_data), context_data.length);
        console.log("detected last passage is the end save this ...", enphizis(LastNameTag), shorten(passage));
        this.save_buffer_between(passage, LastNameTag);
      }


      if (marker_x(context_data) < context_data.length) {
        console.log("empty buffer object start writing content ...", enphizis(LastNameTag), shorten(passage));
        this.scanBufferTempData = {
          last_tag_name: LastNameTag,
          last_incomplete_sentence: passage,
          from_page: this.options.from
        };
      }
      //end save previous item
    }
  } else {
    console.log("not empty buffer object, add more content to the buffer ....");
    this.scanBufferTempData.last_incomplete_sentence += context_data;
  }
};
cxpdfnMining.prototype.save_buffer_between = function (captured, name_tag) {
  const result = {
    content: captured,
    metadata: [name_tag, this.getExternal().data_bill_title, this.getExternal().data_internal_key],
    scanrange: {
      start: this.options.from,
      end: this.options.to
    },
    thread_date: this.document_date,
    data_speaker: name_tag
  };
  console.log("> save thread between... ", enphizis(name_tag), captured);
  this.emit('scanpage', this.finalizeResultObject(result));
};
cxpdfnMining.prototype.betweenHeadFooterThreads = function (indices, pre_capture_context) {
  var captured, loop = true, p = 0, previousIndex = -1, currentIndex = -1;
  if (indices.length >= 2) {
    while (loop) {
      if (p < indices.length - 1) {
        currentIndex = indices[p].index;
        if (p > 0) {
          previousIndex = indices[p - 1].index;
          if (previousIndex == currentIndex) {
            console.error("index crash! @Index: " + previousIndex);
            p++;
            continue;
          }
        }
        captured = getIntervalInBetween(indices, p, pre_capture_context);
        const name_tag = nameTag(indices[p]);
        this.save_buffer_between(captured, name_tag);
        p++;
      } else {
        loop = false;
      }
    }
  }
};
/**
 * the capture context without bookmarks
 * @param pre_capture_context
 */
cxpdfnMining.prototype.proc_context_type1 = function (pre_capture_context) {
  var objLis = this.indexMetaList(pre_capture_context);
  this.resolve_buffer_context(objLis, pre_capture_context);
  this.betweenHeadFooterThreads(objLis, pre_capture_context);
  this.next_wave();
};

cxpdfnMining.prototype.checkDuplicateError = function (data) {
  if (this.scan_error_check.indexOf(data) == -1) {
    this.scan_error_check.push(data);
    return false;
  } else {
    return true;
  }
};
cxpdfnMining.prototype.errorNoPDFformat = function () {
  this.emit("complete", "next document.. no pdf format type can be found from this PDF");
};
cxpdfnMining.prototype.process_pages_type2 = function (pageMode) {
  if (this.pdf_type != 2) {
    this.errorNoPDFformat();
    return;
  }
  xpdfUtil.pdfToText(this.filepath, this.options, function (err, data) {
    if (err) {
      console.log("=== error form xpdf util ===");
      console.log("scan page at p" + this.options.from + " to p" + this.options.to);
      console.log("out", err);
      //this.emit("error", err.message);
      this.next_wave();
      return;
    }
    this.document_context = new String(data);
    if (this.options.from != this.options.to) {
      console.log("====================");
      console.log("review cross page ref.", this.document_context);
      console.log("====================");
    }
    this.proc_context_type2(pageMode);
  }.bind(this));
};
cxpdfnMining.prototype.process_pages_type3 = function () {
  if (this.pdf_type != 3) {
    this.errorNoPDFformat();
    return;
  }
  xpdfUtil.pdfToText(this.filepath, this.options, function (err, data) {
    if (err) {
      console.log("=== error form pdfminer ===");
      console.log("scan page at p" + this.options.from + " to p" + this.options.to);
      console.log("out", err);
      console.log("=== skip this for the next scan ===");
      this.next_wave();
      return;
    }
    const text = fixPassageContentBugPass(data);
    // console.log("=== xpdfUtil.pdfToText ===");
    // console.log(text);
    // console.log("=== xpdfUtil.pdfToText ===");
    this.proc_context_type1(text);
  }.bind(this));
};
cxpdfnMining.prototype.process_pages_type1 = function () {
  if (this.pdf_type != 0) {
    this.errorNoPDFformat();
    return;
  }
  pdfminer.pdfToText(this.filepath, this.options, function (err, data) {
    if (err) {
      console.log("=== error form pdfminer ===");
      console.log("scan page at p" + this.options.from + " to p" + this.options.to);
      console.log("out", err);
      console.log("=== skip this for the next scan ===");
      console.log("=== error end ===");
      //this.emit("error", err.message);
      this.next_wave();
      return;
    }
    const text = new String(data);
    this.proc_context_type1(text);
  }.bind(this));
};
module.exports = new cxpdfnMining();