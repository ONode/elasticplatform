/**
 * Created by hesk on 2016/9/26.
 */
var PythonShell = require('python-shell');
const path = require('path');
const fs = require('fs');
const bufferProcess = require('pdf-util/lib/textprocessing');
function PDF() {
  if (false === (this instanceof PDF)) {
    return new PDF();
  }
}
const env = process.env.NODE_PATH + "/pdfminer/build/scripts-2.7/";
const target = process.env.NODE_PATH + "/tmp/";
PDF.prototype.pdfToText = function (pdf_path, options, callback) {
  var argsarr = [];
  var output = '';
  // console.log("> Python Shell file path", pdf_path);
  fs.exists(pdf_path, function (exist) {
    if (!exist) return callback('no file exists at the path you specified', null);
    //extract.process(pdf_path, options, cb);
    if (options == null) {
      return callback("must define options", null);
    }
    if (isNaN(options.from)) {
      return callback("must define options.from", null);
    }
    if (isNaN(options.to)) {
      return callback("must define options.to", null);
    }
    var delta = parseInt(options.to) - parseInt(options.from);
    argsarr.push("-p");


    if (delta > 0) {
      var pages = [];
      pages.push(parseInt(options.from));
      var to = parseInt(options.to);
      var from = parseInt(options.from);
      while (from < to) {
        var n = from + 1;
        pages.push(n);
      }
      argsarr.push(pages.join());
    } else {
      argsarr.push(options.from);
    }

    if (delta < 0) {
      return callback("must follow the rule set from smaller than to", null);
    } else {
      delta = delta + 1;
    }

    argsarr.push("-m");
    argsarr.push(delta);
    argsarr.push(pdf_path);

    //  console.log("> Python Shell args", argsarr);

    var shell = new PythonShell('pdf2txt.py', {
      mode: 'text',
      scriptPath: env,
      args: argsarr
    });

    shell.on('message', function (message) {
      // received a message sent from the Python script (a simple "print" statement)
      // console.log(message);
      output += bufferProcess.buffer(message, options)
    });

    shell.end(function (err) {
      if (err) {
        callback(err.message, null);
      } else {
        //console.log(output);
        callback(null, output);
      }
      // console.log('finished');
      // callback(null, output);
    });

    //shell.send("start");
  });
};


module.exports = new PDF();