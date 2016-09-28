/*
 * Calaca - Search UI for Elasticsearch
 * https://github.com/romansanchez/Calaca
 * http://romansanchez.me
 * @rooomansanchez
 * 
 * v1.2.0
 * MIT License
 */

/* Calaca Controller
 *
 * On change in search box, search() will be called, and results are bind to scope as results[]
 *
 */
Calaca.controller('calacaCtrl', ['calacaService', '$scope', '$location', function (results, $scope, $location) {
    //Init empty array
    $scope.results = [];
    //Init offset
    $scope.offset = 0;
    $scope.showNextButton = false;
    $scope.search_query = {
      query: null,
      honourable: null,
      year: null,
      selecteddate: null
    };

    var paginationTriggered;
    var itemsPerPage = CALACA_CONFIGS.size;
    var searchTimeout;

    /**
     * Create filter function for a query string
     */
    function createFilterFor(query) {
      // var lowercaseQuery = angular.lowercase(query);
      return function filterFn(list) {
        return (list.full.indexOf(query) === 0);
      };
    }


    $scope.autoc = {
      simulateQuery: false,
      isDisabled: false,
      // list of `state` value/display objects
      states: $scope.loadSelectionName,
      querySearch: function (query) {
        var results = query ? $scope._selectionNames.filter(createFilterFor(query)) : $scope._selectionNames,
          deferred;
        if ($scope.autoc.simulateQuery) {
          deferred = $q.defer();
          $timeout(function () {
            deferred.resolve(results);
          }, Math.random() * 1000, false);
          return deferred.promise;
        } else {
          return results;
        }
      },
      selectedItemChange: function (text) {
        //$log.info('Text changed to ' + text);
      },
      searchTextChange: function (text) {
        if (text.length == 0) {
          $scope.search_query.honourable = null;
        }
      },
      newState: function (name) {
        alert("Sorry! You'll need to create a Constitution for " + name + " first!");
      }
    };

    $scope.delayedSearch = function (mode) {
      clearTimeout(searchTimeout);
      console.log($scope.search_query);
      searchTimeout = setTimeout(function () {
        $scope.search(mode)
      }, CALACA_CONFIGS.search_delay);
    };

    //On search, reinitialize array, then perform search and load results
    $scope.search = function (m) {
      $scope.results = [];
      $scope.offset = m == 0 ? 0 : $scope.offset;//Clear offset if new query
      $scope.loading = m == 0 ? false : true;//Reset loading flag if new query
      if (m == -1 && paginationTriggered) {
        if ($scope.offset - itemsPerPage >= 0) {
          $scope.offset -= itemsPerPage;
        }
      }
      if (m == 1 && paginationTriggered) {
        $scope.offset += itemsPerPage;
      }
      $scope.paginationLowerBound = $scope.offset + 1;
      var b1 = $scope.offset + itemsPerPage;
      var b2 = b1 > $scope.hits ? $scope.hits : b1;
      var b3 = $scope.hits < itemsPerPage ? $scope.hits : itemsPerPage;
      $scope.paginationUpperBound = ($scope.offset === 0) ? b3 : b2;
      $scope.loadResults(m);
    };

    $scope._index_year = [""];
    for (var nowyr = 2016; nowyr >= 2008; nowyr--) {
      $scope._index_year.push(nowyr + "");
    }
    $scope._selectionNames = [];
    $scope.selectedItem = "";
    $scope.searchText = "";

    $scope.loadSelectionName = function () {
      return results.dictionary().then(function (data) {
        var arrayDict = [];
        var oblist = data["objectlist"];
        var oblistp = data["arraylist"];
        angular.forEach(oblist, function (value, key) {
          arrayDict.push(value);
        });
        angular.forEach(oblistp, function (value, key) {
          arrayDict.push({
            full: value
          });
        });
        //  console.log(arrayDict);
        $scope._selectionNames = arrayDict;
      });
    };


    $scope.loadSelectionName();
    //Load search results into array
    $scope.loadResults = function (big_search_query_objec) {
      if ($scope.selectedItem != null) {
        $scope.search_query.honourable = $scope.selectedItem.full;
      }
      console.log($scope.offset);
      results.ELsearch($scope.search_query, big_search_query_objec, $scope.offset).then(function (a) {
        //Load results
        var i = 0;
        for (; i < a.hits.length; i++) {
          $scope.results.push(a.hits[i]);
        }
        //Set time took
        $scope.timeTook = a.timeTook;
        //Set total number of hits that matched query
        $scope.hits = a.hitsCount;
        //Pluralization
        $scope.resultsLabel = $scope.hits > 1 ? "results" : "result";
        //Check if pagination is triggered
        $scope.showNextButton = $scope.hits > parseInt($scope.offset + itemsPerPage);
        //Set loading flag if pagination has been triggered
        paginationTriggered = $scope.hits > itemsPerPage;
        // console.log("pagination: " + paginationTriggered);
        if (paginationTriggered) {
          $scope.loading = true;
        }
      });
    };

    $scope.paginationEnabled = function () {
      return paginationTriggered ? true : false;
    };

    $scope.press_calen = function () {
      $scope.search_query.selecteddate = new Date();
      $scope.minDate = new Date(
        $scope.search_query.selecteddate.getFullYear(),
        $scope.search_query.selecteddate.getMonth() - 2,
        $scope.search_query.selecteddate.getDate());
      $scope.maxDate = new Date(
        $scope.search_query.selecteddate.getFullYear(),
        $scope.search_query.selecteddate.getMonth() + 2,
        $scope.search_query.selecteddate.getDate());
    };

    $scope.onlyWeekendsPredicate = function (date) {
      var day = date.getDay();
      return day === 0 || day === 6;
    };

  }]
);