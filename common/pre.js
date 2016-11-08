/**
 * Created by hesk on 16年11月8日.
 */
"use strict";
const
  _ = require("lodash"),
  crackTool = require("./crackTool").crackTool,
  marker_x = require("./crackTool").marker_x,
  mPersonnelDict_2008_2012 = require('./../data/tags_2008_2012.json'),
  mInputPersonDictionary = require("./../data/tags.json");

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
  return context_data.substring(start, context_data.length);
};

Array.prototype.unique = function () {
  var o = {}, i, l = this.length, r = [];
  for (i = 0; i < l; i += 1) o[this[i]] = this[i];
  for (i in o) r.push(o[i]);
  return r;
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

function chunkSubstr(str, size) {
  var numChunks = Math.ceil(str.length / size),
    chunks_list = new Array(numChunks),
    lastPiece = 0;
  for (var i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks_list[i] = str.substr(o, size);
    lastPiece = o + size;
  }
  return {
    chucks: chunks_list,
    last: lastPiece
  };
}

module.exports = {
  util: require("util"),
  l: _,
  pdfminer: require("./pdfminer.js"),
  xpdfUtil: require("pdf-util"),
  cpdfUtil: require("cpdf-n"),
  crackTool: require("./crackTool").crackTool,
  fixPreTool: require("./crackTool").fixPassageContentBugPass,
  resolveConflict: require("./crackTool").resolveConflict,
  enphizis: require("./crackTool").enphizis,
  nameTag: require("./crackTool").nameTag,
  shorten: require("./crackTool").shorten,
  marker_x: require("./crackTool").marker_x,
  check_errors: require("./crackTool").checkNotMins,
  events: require("events"),
  dateFormat: require('dateformat'),
  chuckString: chunkSubstr
};