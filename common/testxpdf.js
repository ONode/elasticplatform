/**
 * Created by zJJ on 8/12/2016.
 */

const path = require('path');
const EventEmitter = require('events');
const objectdefinedv6 = require('./pdf_cpdf_name_base_v6');
const xpdfUtil = require('pdf-util');

const testcaseapiv6 = function (options, res) {
  const home_tmp_folder = path.dirname(module.main) + "/test/";
  const file = home_tmp_folder + "cm0710-translate-c.pdf";
  options.out = file;
  console.log("pdf to EK", options.out);
  const poc = new objectdefinedv6(options);
  console.log(poc instanceof EventEmitter); // true
  console.log(objectdefinedv6.super_ === EventEmitter); // true
  console.log(poc);
  poc.on('bookmark_print', function (b) {
    console.log('> ', b);
  });
  poc.start();
  res.json({"result": "working"});
};
const testcaseapiv5 = function (options, res) {
  xpdfUtil.info(file, function (err, info) {
    if (err) throw(err);
    console.log("=== log info ===");
    console.log(info);
    options.to = info.pages;
    xpdfUtil.pdfToText(file, options, function (err, data) {
      if (err) {
        console.log("=== error form pdfToText ===");
        return callback(err);
      }

      const result = {
        content: data,
        title: "X Minutes pages:" + info.pages,
        metadata: []
      };

      console.log("> result xPDF::: ", result);
      res.json(result);
    });
  });

};

module.exports = {
  testcaseapi: testcaseapiv6,
  testcasexpdf: testcaseapiv5
};