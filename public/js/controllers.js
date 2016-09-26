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

    var paginationTriggered;
    var maxResultsSize = CALACA_CONFIGS.size;
    var searchTimeout;
    $scope.autocompletescope = {
      simulateQuery: false,
      isDisabled: false,
      // list of `state` value/display objects
      states: $scope.loadSelectionName,
      querySearch: function (query) {
        var results = query ? self.states.filter(createFilterFor(query)) : self.states,
          deferred;
        if (self.simulateQuery) {
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
        //$log.info('Text changed to ' + text);
      },
      newState: function (name) {
        alert("Sorry! You'll need to create a Constitution for " + name + " first!");
      }
    };
    $scope.search_query = {
      query: null,
      honourable: null,
      year: null,
      selecteddate: null
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
        if ($scope.offset - maxResultsSize >= 0) $scope.offset -= maxResultsSize;
      }
      if (m == 1 && paginationTriggered) {
        $scope.offset += maxResultsSize;
      }
      $scope.paginationLowerBound = $scope.offset + 1;
      $scope.paginationUpperBound = ($scope.offset == 0) ? maxResultsSize : $scope.offset + maxResultsSize;
      $scope.loadResults(m);
    };
    $scope._index_year = ["", "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016"];
    $scope._selectionNames = null;
    $scope.loadSelectionName = function () {
      return results.persons().then(function (data) {
        $scope._selectionNames = data;
      });
    };

    //Load search results into array
    $scope.loadResults = function (m) {
      results.ELsearch($scope.search_query, m, $scope.offset).then(function (a) {
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
        $scope.resultsLabel = ($scope.hits != 1) ? "results" : "result";
        //Check if pagination is triggered
        paginationTriggered = $scope.hits > maxResultsSize ? true : false;
        //Set loading flag if pagination has been triggered
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