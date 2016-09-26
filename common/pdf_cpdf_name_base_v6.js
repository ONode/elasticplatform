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
  events = require("events"),
  dateFormat = require('dateformat'),
  mPersonnelDict_2008_2012 = require('./personnel_2008_2012.json'),
  mInputPersonDictionary = require("./ppmap.json");

const options_instance = {
  interval_pages: 15,
  remove_space_asian_character: false,
  new_paragraph: false,
  remove_single_n_english: false,
  only_preindex: false,
  from: 0,
  to: 10
};
const crackTool = {
  bookmark: /(SP_[A-Z][A-Z]_[A-Z]+_)\w+/g,
  bookmark_old_style: /(SP_[A-Z][A-Z]_[A-Z]+_)\w+/g,
  page: /\b\d{1,}/g,
  tag_name: /SP_[A-Z][A-Z]_\w+_/g,
  tag_name_old: /SP_[A-Z][A-Z]_\w+/g,
  bookmark_meeting_process: /b\d\w+/g,
  post_process_extraction: '',
  tag_extract_name_person: /[\u4e00-\u9fa5]+[^\uff1a]/g,
  punctual_marks: ["？", "。", "）", "》", "......"],
  name_mark: ["《", "》", "："]
};
var enphizis = function (person_name) {
  return crackTool.name_mark[0] + person_name + crackTool.name_mark[1];
};
function nameTag(object_tag) {
  const chinese_name = object_tag.token.match(crackTool.tag_extract_name_person);
  const name_tag = chinese_name[0] == null ? "**NOT FOUND**" : chinese_name[0];
  return name_tag;
};
var marker_x = function (text_info) {
  var last_mark_index_k2 = -1;
  _.forEach(crackTool.punctual_marks, function (mark) {
    var v2 = text_info.lastIndexOf(mark);
    if (v2 > -1) {
      if (v2 > last_mark_index_k2) {
        last_mark_index_k2 = v2;
      }
    }
  });
  return last_mark_index_k2;
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
    arrayDict.push(new String(object.full));
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
  console.log('> =====================================.');
  console.log('> ======= pre-index miner page=======.');
  console.log('> ===================================.');
  console.log('> final name tags', showlist);
  console.log('> ===========================.');
}
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
  this.index_trail = [];
  this.iterate = 0;
  this.pdf_type = -1;
  this.maxpages = 0;
  this.scanBufferTempData = {};
  this.document_date = "";
  this.scan_error_check = [];
  this.flatten_dictionary = loadDictionary();
  //console.log("flattened array", this.flatten_dictionary);
  //console.log("=== pdf to text ===");
  this.options.external = config;
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
cxpdfnMining.prototype.startDemo = function () {
  this.emit("complete", "star then the next test");
  return;
};
cxpdfnMining.prototype.start = function () {
  cpdfUtil.listBookmarks(this.filepath).then(function (arrayList) {
    this.bookmarks_analyzer(arrayList);
  }.bind(this), function (error) {
    console.log('pdf error', error);
  }).then(function () {
    xpdfUtil.info(this.filepath, function (err, info) {
      if (err) throw(err);
      if (this.options.only_preindex) {
        console.log("=== only_preindex ===");
        this.emit("complete", "only_preindex_done");
      } else {

        console.log("=== log info ===");
        console.log(info);
        console.log("================");

        var nowdate = parseInt(info.creationdate);
        this.document_date = dateFormat(nowdate, "isoDateTime");
        this.maxpages = parseInt(info.pages);
        if (this.pdf_type == 2) {
          this.updateScanPageConfigAtNodeObject(this.iterate);
          this.process_pages();
        } else if (this.pdf_type == 0) {
          this.updateScanPageConfigSinglePage(1);
          this.process_pages();
        }
      }
    }.bind(this));
  }.bind(this));
};


cxpdfnMining.prototype.updateScanPageConfigAtNodeObject = function (inter) {
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
cxpdfnMining.prototype.updateScanPageConfigSinglePage = function (pagenum) {
  this.options.from = pagenum;
  this.options.external.from = pagenum;
  this.options.to = pagenum;
  this.options.external.to = pagenum;
  console.log("classic doc scan interval from p" + pagenum + " to p" + pagenum);
};
cxpdfnMining.prototype.next_wave = function () {
  if (this.pdf_type == 2) {
    // console.log('pdf type is starting at two');
    if (this.updateScanPageConfigAtNodeObject(this.iterate + 1)) {
      this.process_pages();
    } else {
      this.emit("complete", "doneTypeTwo");
    }
  } else if (this.pdf_type == 0) {
    console.log('next wave process now', this.options.to + "/" + this.maxpages);
    if (this.maxpages > (parseInt(this.options.to) + 1)) {
      this.updateScanPageConfigSinglePage(parseInt(this.options.to) + 1);
      this.process_pages();
    } else {
      this.resolve_buffer_complete(function () {
        this.emit("complete", "doneTypeZero");
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
cxpdfnMining.prototype.finalizeResultObject = function (r) {
  r.data_internal_key = this.getExternal().data_internal_key;
  r.data_read_order = this.getExternal().data_read_order;
  r.data_source_url = this.getExternal().url;
  r.data_bill_title = this.getExternal().data_bill_title;
  return r;
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
    var cur_dim_possible = _.has(mInputPersonDictionary, cur_item_tag);
    //console.log("first tag is found", cur_dim_possible);
    if (cur_dim_possible && cur_item_tag != null) {
      var b1_token = _.get(mInputPersonDictionary, [cur_item_tag, "full"]), b2_token;
      var b1 = pre_capture_context.indexOf(b1_token) + b1_token.length, b2 = -1;
      var rest_sentence = pre_capture_context.substring(b1, pre_capture_context.length);
      if (this.hasNextNode()) {
        //console.log("has next node");
        const next_item_tag = this.getNextScanningIndex().tag;
        var next_dim_possible = _.has(mInputPersonDictionary, next_item_tag);
        b2_token = _.get(mInputPersonDictionary, [next_item_tag, "full"]);
        b2 = rest_sentence.indexOf(b2_token);
        if (b2 == -1 && next_dim_possible) {
          _.forEach(mInputPersonDictionary, function (object) {
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
        _.forEach(mInputPersonDictionary, function (object) {
          var h2 = rest_sentence.lastIndexOf(object.full);
          if (h2 > -1) {
            b2 = h2;
            console.log("found tag position: " + object.full, h2);
            return false;
          }
        });
        if (b2 == -1) {
          b2 = marker_x(rest_sentence);
          if (b2 > -1) {
            console.log("found mark position: " + mark, v2);
            return false;
          } else if (b2 == -1) {
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
      const chinese_name = b1_token.match(crackTool.tag_extract_name_person);
      const name_tag = chinese_name[0] == null ? "**NOT FOUND**" : chinese_name[0];
      //   console.log("> capture extract: " + name_tag, "page:" + this.options.from, b1, cap_end, captured.length);
      console.log("> common: ", enphizis(name_tag), captured);
      // console.log('process: ', 'cascasc');
      // console.log("> content: ", pre_capture_context);
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
      this.emit('scanpage', this.finalizeResultObject(result));
      this.next_wave();
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
 * @param mark
 * @param content_data
 * @returns {Array}
 */
function getIndicesOfCn(mark, content_data) {
  var markLen = mark.length;
  if (markLen == 0 || content_data.length == 0) {
    return [];
  }

  var startIndex = 0, index = -1, indices = [], loop = true;
  while (loop) {
    index = content_data.indexOf(mark, startIndex);
    if (index > -1) {
      startIndex = index + mark.length;
      indices.push(index);
    } else {
      loop = false;
    }
  }
  return _.sortedUniq(indices);
}
var getEnhancedSentence = function (extract) {
  var end_mark = marker_x(extract);
  if (end_mark > -1) {
    return extract.substring(0, end_mark + 1);
  } else {
    return extract;
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


/**
 * this is the key part of the wild auto mapping system indicator
 * @param data
 * @returns {Array}
 */
cxpdfnMining.prototype.indexMetaList = function (data) {
  //var exclude = "列席秘書：";
  var main = [];
  var compare_slot_1 = [], compare_slot_2 = [], compare_slot_3 = [];

  _.forEach(this.flatten_dictionary, function (mark_name) {
    var marks = _.sortedUniq(getIndicesOfCn(mark_name, data));
    if (mark_name == "商務及經濟發展局局長：" && marks.length > 0) {
      compare_slot_1 = marks;
    }
    if (mark_name == "發展局局長：" && marks.length > 0) {
      compare_slot_2 = marks;
    }
    if (mark_name == "秘書：" && marks.length > 0) {
      compare_slot_3 = marks;
    }

    if (marks.length > 0) {
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

  /**
   * confusion for 商務及經濟發展局局長 and 發展局局長
   */
  if (compare_slot_2.length > 0 && compare_slot_1.length > 0) {
    var test_index_1 = compare_slot_2[0];
    var test_index_2 = compare_slot_1[0];
    var delta = Math.abs(test_index_1 - test_index_2);
    if (delta < 10) {
      _.remove(main, function (n) {
        console.log("remove item for 商務及經濟發展局局長");
        return compare_slot_2.indexOf(n.index) > -1;
      });
    }
  }

  var listarray = _.sortBy(main, [function (o) {
    return o.index;
  }]).unique();
  console.log("indicators", listarray);
  return listarray;
};
cxpdfnMining.prototype.resolve_buffer_complete = function (callback) {
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
    console.log("> save previous buffer last...", enphizis(this.scanBufferTempData.last_tag_name));
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
        console.log("> save previous buffer...", enphizis(this.scanBufferTempData.last_tag_name));
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
      var nametag = nameTag(indices[indices.length - 1]);
      //the last one buffer passage
      console.log("empty buffer object start writing content ...", enphizis(nametag));
      this.scanBufferTempData = {
        last_tag_name: nametag,
        last_incomplete_sentence: getIntervalAtEnd(indices, indices.length - 1, context_data),
        from_page: this.options.from
      };
      //end save previous item
    }
  } else {
    console.log("not empty buffer object, add more content to the buffer ....");
    this.scanBufferTempData.last_incomplete_sentence += context_data;
  }
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
cxpdfnMining.prototype.process_smart_mapping = function (pre_capture_context) {
  var mCyx = this.indexMetaList(pre_capture_context);
  this.resolve_buffer_context(mCyx, pre_capture_context);
  this.betweenHeadFooterThreads(mCyx, pre_capture_context);
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
cxpdfnMining.prototype.process_pages = function () {
  // console.log('> set trail index ', this.iterate);
  // console.log('> set trail display', this.index_trail[this.iterate]);
  // console.log('> set options', this.options);
  if (this.pdf_type == 2) {
    xpdfUtil.pdfToText(this.filepath, this.options, function (err, data) {
      if (err) {
        console.log("=== error form xpdf util ===");
        console.log("out", err);
        //this.emit("error", err.message);
        this.next_wave();
        return;
      }
      if (this.checkDuplicateError(data)) {
        console.log("=== error duplicate scanned text ===");
        //this.emit("error", "duplicate scanned text", this.options.from);
        this.next_wave();
        return;
      }
      const raw_dat = new String(data);
      this.process_nowadays(raw_dat);
    }.bind(this));
  } else if (this.pdf_type == 0) {
    pdfminer.pdfToText(this.filepath, this.options, function (err, data) {
      if (err) {
        console.log("=== error form pdfminer ===");
        console.log("out", err);
        //this.emit("error", err.message);
        this.next_wave();
        return;
      }
      const raw_dat = new String(data);
      this.process_smart_mapping(raw_dat);
    }.bind(this));
  } else {
    this.emit("complete", "next document.. no pdf format type can be found from this PDF");
  }
};
module.exports = new cxpdfnMining();