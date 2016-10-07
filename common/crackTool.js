/**
 * Created by hesk on 2016/10/4.
 */
module.exports.crackTool = {
  bookmark: /(SP_[A-Z][A-Z]_[A-Z]+_)\w+/g,
  bookmark_old_style: /(SP_[A-Z][A-Z]_[A-Z]+_)\w+/g,
  page: /\b\d{1,}/g,
  tag_name: /SP_[A-Z][A-Z]_\w+_/g,
  tag_name_old: /SP_[A-Z][A-Z]_\w+/g,
  bookmark_meeting_process: /b\d\w+/g,
  fix_bug_digit_char: /(\d+\.)/g,
  fix_bug_date_sub: /(日\d{4})/g,
  fix_bug_date_pre: /(\d{4}立法會)/g,
  date_cn_extraction: /(立法會─\d{4}年\d{1,2}月\d{1,2}日)/g,
  date_cn_extraction_v1: /(\d{4}年\d{1,2}月\d{1,2}日)/g,
  date_cn_extraction_v2: /(LEGISLATIVECOUNCIL─\d{2}[A-Z][a-z].+\d{4,5})/g,
  post_process_extraction: '',
  tag_extract_name_person: /[\u4e00-\u9fa5]+[^\uff1a]/g,
  punctual_marks: ["！", "？", "。", "）", "》", "......"],
  name_mark: ["《", "》", "：", "（", "）"]
};