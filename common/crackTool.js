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
  date_cn_extraction_v2: /(LEGISLATIVECOUNCIL─\d{1,2}[A-Z][a-z].+\d{6,8})/g,
  date_cn_extraction_v3: /(\d{2,4}LEGISLATIVECOUNCIL─\d{1,2}[A-Z][a-z].+\d{4})/g,
  date_cn_extraction_v4: /(立法會─\d{4}年\d{1,2}月\d{1,2}日)/g,
  post_process_extraction: '',
  tag_extract_name_person: /[\u4e00-\u9fa5]+[^\uff1a]/g,
  punctual_marks: ["！", "？", "。", "）", "》", "......"],
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
var fix_pass = function (context) {
  var
    b2 = context.match(tool.fix_bug_date_sub),
    b3 = context.match(tool.fix_bug_date_pre),
    b4 = context.indexOf(")"),
    b5 = context.indexOf("("),
    b8 = context.indexOf("（譯文）："),
    out = context;

  /* if (b2 != null && b2.length > 0) {
   out = out.replace(tool.fix_bug_date_sub, "日");
   }
   if (b3 != null && b3.length > 0) {
   out = out.replace(tool.fix_bug_date_pre, "立法會");
   }*/

  //  out = checkerFilter(out, tool.fix_bug_digit_char);
  if (b4 > -1) {
    out = out.replaceAll(")", tool.name_mark[4]);
  }
  if (b5 > -1) {
    out = out.replaceAll("(", tool.name_mark[3]);
  }

  //out = checkerFilter(out, tool.date_cn_extraction);
  out = checkerFilter(out, tool.date_cn_extraction_v4);
  out = checkerFilter(out, tool.date_cn_extraction_v2);
  out = checkerFilter(out, tool.date_cn_extraction_v3);

  if (b8 > -1) {
    out = out.replaceAll("（譯文）：", "：");
  }
  return out;
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


module.exports.test_array = test_array_v;
module.exports.crackTool = tool;
module.exports.resolveConflict = conflict_resolve;
module.exports.fixPassageContentBugPass = fix_pass;
