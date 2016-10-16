/**
 * Created by hesk on 2016/10/4.
 */
var _ = require("lodash");
var tool = {
  bookmark: /(SP_[A-Z][A-Z]_[A-Z]+_)\w+/g,
  bookmark_old_style: /(SP_[A-Z][A-Z]_[A-Z]+_)\w+/g,
  page: /\b\d{1,}/g,
  tag_name: /SP_[A-Z][A-Z]_\w+_/g,
  tag_name_old: /SP_[A-Z][A-Z]_\w+/g,
  bookmark_meeting_process: /b\d\w+/g,
  fix_bug_digit_char: /(\d+\.)/g,
  fix_bug_date_sub: /(日\d{4})/g,
  fix_bug_date_pre: /(\d{4}立法會)/g,
  date_cn_extraction: /(立法會─\d{4}年\d{1,2}月\d{1,2}日\d{3,4})/g,
  date_cn_extraction_v1: /(\d{4}年\d{1,2}月\d{1,2}日)/g,
  date_cn_extraction_v2: /(LEGISLATIVECOUNCIL─\d{1,2}(January|February|March|April|May|June|July|August|September|October|November|December)\d{6,8})/g,
  date_cn_extraction_v3: /(\d{2,4}LEGISLATIVECOUNCIL─\d{1,2}(January|February|March|April|May|June|July|August|September|October|November|December)\d{4})/g,
  date_cn_extraction_v4: /(立法會─\d{4}年\d{1,2}月\d{1,2}日)/g,
  date_cn_extraction_v5: /A\d{1}LEGISLATIVECOUNCIL─\d{1,2}(January|February|March|April|May|June|July|August|September|October|November|December)\d{4}/g,
  date_cn_extraction_v6: /LEGISLATIVECOUNCIL─\d{1,2}(January|February|March|April|May|June|July|August|September|October|November|December)\d{4}A\d{1}/g,
  post_process_extraction: '',
  tag_extract_name_person: /[\u4e00-\u9fa5]+[^\uff1a]/g,
  punctual_marks: ["！", "？", "。", "）", "》", "......", "."],
  name_mark: ["《", "》", "：", "（", "）"]
};

var conflict_resolve = function (main_array, longer_token_with_col, short_token_ar, longer_token_ar) {
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
var checkerFilter = function (context, regex) {
  var matched = context.match(regex);
  if (matched != null && matched.length > 0) {
    return context.replace(matched, "");
  }
  return context;
};
var checkListConditions = function (context, conditions) {
  var hits = [], i = 0;
  _.forEach(conditions, function (condition) {
    if (context.match(condition)) {
      hits.push(i);
    }
    i++;
  });
  return hits;
};
var not_original_minutes = function (context) {
  var found = checkListConditions(context, [
    tool.date_cn_extraction_v5,
    tool.date_cn_extraction_v6
  ]);
  return found;
};
var fix_pass = function (context) {
  var
    b2 = context.match(tool.fix_bug_date_sub),
    b3 = context.match(tool.fix_bug_date_pre),
    out = context;
  /* if (b2 != null && b2.length > 0) {
   out = out.replace(tool.fix_bug_date_sub, "日");
   }
   if (b3 != null && b3.length > 0) {
   out = out.replace(tool.fix_bug_date_pre, "立法會");
   }*/
  //  out = checkerFilter(out, tool.fix_bug_digit_char);
  if (context.indexOf(")") > -1) {
    out = out.replaceAll(")", tool.name_mark[4]);
  }
  if (context.indexOf("(") > -1) {
    out = out.replaceAll("(", tool.name_mark[3]);
  }

  //out = checkerFilter(out, tool.date_cn_extraction);
  out = checkerFilter(out, tool.date_cn_extraction_v4);
  out = checkerFilter(out, tool.date_cn_extraction_v2);
  out = checkerFilter(out, tool.date_cn_extraction_v3);
  out = checkerFilter(out, tool.date_cn_extraction_v5);
  out = checkerFilter(out, tool.date_cn_extraction_v6);

  if (context.indexOf("（譯文）：") > -1) {
    out = out.replaceAll("（譯文）：", "：");
  }
  return out;
};
var enphizis = function (person_name) {
  return tool.name_mark[0] + person_name + tool.name_mark[1];
};
var nameTag = function (object_tag) {
  const chinese_name = object_tag.token.match(tool.tag_extract_name_person);
  const name_tag = chinese_name[0] == null ? "**NOT FOUND**" : chinese_name[0];
  return name_tag;
};
var shorten = function (context) {
  var char_len = 6;
  if (context.length > 30) {
    return context.substring(0, char_len) + tool.punctual_marks[5] + context.substring(context.length - char_len, context.length);
  } else {
    return context;
  }
};
var marker_x = function (text) {
  var last_mark_index_k2 = -1;
  _.forEach(tool.punctual_marks, function (mark) {
    var v2 = text.lastIndexOf(mark);
    if (v2 > -1) {
      if (v2 > last_mark_index_k2) {
        last_mark_index_k2 = v2;
      }
    }
  });
  return last_mark_index_k2;
};
var test_array_v = function (arrayList) {
  var list = arrayList[0].split("\n1");
  console.log('> display all.. ', list);
  var test_item_index = 15;
  var r1 = list[test_item_index].match(tool.bookmark);
  var r2 = list[test_item_index].match(tool.page);
  var r3 = list[test_item_index].match(tool.bookmark_meeting_process);
  console.log('> display item ', list[test_item_index]);
  console.log('> display matches.. ', r1);
  if (!_.isEmpty(r1[0]) && !_.isEmpty(r2[0])) {
    console.log('> display match bookmark tag', r1[0]);
    console.log('> display match bookmark page', r2[0]);
    var page = r2[0], bookmark = r1[0];
  }
};

module.exports.crackTool = tool;
module.exports.enphizis = enphizis;
module.exports.nameTag = nameTag;
module.exports.shorten = shorten;
module.exports.marker_x = marker_x;
module.exports.test_array = test_array_v;
module.exports.resolveConflict = conflict_resolve;
module.exports.fixPassageContentBugPass = fix_pass;
module.exports.checkNotMins = not_original_minutes;
