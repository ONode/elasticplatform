/**
 * Created by hesk on 2016/10/4.
 */
const target_domain = "http://app.legco.gov.hk/BillsDB/odata/Vbills";
var http = require("http");
var fs = require("fs");
var fse = require("fs-extra");
const path = require("path");
const async = require("async");
var request = require("request");
var _ = require("lodash");
const logTag = "> crawler";
var cheerio = require("cheerio");
var filelist = require("./../data/files2013_2014.json");
var make_scan = function () {
  var printout = [];
  async.eachSeries(filelist.meetings, function (activity, callback) {
    request(activity.web, function (error, response, html) {
      // First we'll check to make sure no errors occurred when making the request
      if (!error) {
        // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality
        var $ = cheerio.load(html);
        // Finally, we'll define the variables we're going to capture
        var title, release, rating;
        var json = {title: "", release: "", rating: ""};
        /*
         $('.container>a').filter(function () {

         // Let's store the data we filter into a variable so we can easily see what's going on.
         var data = $(this);
         // In examining the DOM we notice that the title rests within the first child element of the header tag.
         // Utilizing jQuery we can easily navigate and get the text by writing the following code:
         title = data.children().first().attr('href');

         console.log(data.text());
         json.title = title;
         });

         $('.container > a').each(function () {
         var data = $(this);
         var url = data.attr('href');
         if (_.startsWith('http://www.legco.gov.hk')) {
         console.log(url);
         }
         });

         */
        var linkPDF = $(".container > a").first();
        var url_pdf = linkPDF.attr("href");
        // if (_.startsWith("http://www.legco.gov.hk")) {
        // data.src = urlpdf;
        //  console.log(data, ",");
        // }
        printout.push({
          web: activity.web,
          src: url_pdf,
          time: activity.time
        });
        console.log("processed for web", activity.time);
        return callback(null, "done");
      } else {
        console.log("error from loading the website", activity.time, response);
      }
    });

  }, function done() {
    console.log("=====================================");
    console.log("=== scan completed: " + printout.length + " for files ========");
    console.log("=====================================");
    console.log(printout);
  });
  /* _.forEach(filelist.meetings, function (data) {
   var url = data.web;

   });*/
};

module.exports.makescan = make_scan;