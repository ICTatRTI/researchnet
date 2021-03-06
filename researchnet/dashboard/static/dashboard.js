

  // https://learn.jquery.com/using-jquery-core/document-ready/
    // jquery - using .ready() - method makes sure the DOM is loaded before starting the script 

    var chart = dc.dataTable("#dc-table-graph");
    var facts; 

    $(document).ready(function () {

        var submissionDimension;

        // LoadDataAndRenderCharts() calls the ResearchNet API to get the data to visualize and then renders each of the dc charts.
        function LoadDataAndRenderCharts() {

            // Create the dc chart objects passing in where on the page they should be rendered
            // To see a list of all dc chart types, go to http://dc-js.github.io/dc.js/examples/
           
            var subLineChart = dc.lineChart("#dc-sub-chart");
            var placePieChart = dc.pieChart("#dc-place-chart");
            var genderPieChart = dc.pieChart("#dc-gender-chart");
            var usChoroplethChart = dc.geoChoroplethChart("#dc-us-chart");


            // example of reading from a file on the site
            //d3.json('data/sample3.json', function (error, data) {

            // get data from API call - GET method passing in the token as a header parameter
            // http://stackoverflow.com/questions/23993671/how-to-add-authorization-header-while-accessing-json-in-d3
            // https://github.com/d3/d3/wiki/Requests#header
            d3.json('/submission/?limit=1000')
              .header('Authorization', 'Token '+ token)
              .get(function (error, data) {


                // if an exception occured calling the submission endpoint
                if (error) {
                    $('#messageLine').html(
                        '<p class="errorMessage">An error has occurred that may prevent this page from working correctly. '
                        + 'Please use the support information under About this page to get help.<br/>Details:'
                        + error.toString()
                        + '</p>');
                    return console.warn(error);
                }

                // if no data returned
                if (data.count == 0) {
                    $('#messageLine').html(
                        '<p class="errorMessage">An error has occurred that may prevent this page from working correctly. '
                        + 'Please use the support information under About this page to get help.<br/>Details:'
                        + 'No records returned from the API call..'
                        + '</p>');
                        
                    return console.warn(error);
                }


                // TODO: why does this need to go here? 
                // https://github.com/dc-js/dc.js/issues/852
                d3.json("/static/us-states.json", function (error, statesJson) {

                    if (error) {
                        $('#messageLine').html(
                            '<p class="errorMessage">An error has occurred that may prevent this page from working correctly. '
                            + 'Please use the support information under About this page to get help.<br/>Details:'
                            + error.toString()
                            + '</p>');
                        return console.warn(error);
                    }


                    // create a format function? for dates
                    var dtgFormat = d3.time.format("%Y-%m-%dT%H:%M:%S");

                    // debug
                    //alert(xinspect(data));

                    // variables can be formatted or new variables based on the data can be created
                    data.results.forEach(function (d) {

                        //d.dtstart = dtgFormat.parse(d.time_start);
                        d.dtstart = dtgFormat.parse(d.time_start.substr(0, 19));
                        //console.log('date');
                        //console.log(moment(d.dtstart).format('m'));
                        // moment formats - http://momentjs.com/docs/#/parsing/string-format/
                        d.dtstartformatted = moment(d.dtstart).format('MMM Do, YYYY hh:mm:ss A');
                        //d.dtstart = moment(d.time_start.substr(0, 19), "%Y-%m-%dT%H:%M:%S");
                        d.lat = +d.lat;
                        d.long = +d.long;
                    });


                    // load data into crossfilter 
                    facts = crossfilter(data.results);


                    // count all the facts
                    //http://jsfiddle.net/neilsatt/6Zk9v/1/
                    var all = facts.groupAll();
                    dc.dataCount(".dc-data-count")
                    .dimension(facts)
                    .group(all);


                    // define the facts in crossfilter
                    // For each chart:
                    //    X AXIS - create a <data>.dimension to hold X axis values
                    //    Y AXIS - use a dc group map-reduce function to calculate Y axis values - https://github.com/square/crossfilter/wiki/API-Reference#group_reduce
                    //          Examples of map-reduce functions:
                    //              group.size() - number of distinct values regardless of filter applied
                    //              group.reduceCount() - counts records
                    //              group.reduceSum() - adds values
                    //              group.order() - specifies order value for computing top groups
                    //              group.top(k) - returns array containing top k groups desc according to the group order
                    //              group.all() - returns array of all groups. Returned objects contain key and value attributes


                    // ------------------------------------------
                    // define user AGE dimension - Age bar chart
                    // X Axis - list of ages for all the participants
                    var ageValue = facts.dimension(function (d) {
                        //console.log('user age');
                        //console.log(d);
                        //http://stackoverflow.com/questions/14057497/moment-js-how-do-i-get-the-number-of-years-since-a-date-not-rounded-up
                        var years = moment().diff(d.participant.dob, 'years');
                        //console.log(years);
                        return years;
                    });
                    // Y Axis - count ages of each participant
                    var ageGroup = ageValue.group()
                        .reduceCount(function (d) {
                            var years = moment().diff(d.participant.dob, 'years');
                            return years;
                        });
                    // ------------------------------------------


                    // ------------------------------------------
                    // define user CITY dimension - City pie chart
                    // X Axis - list of locations where participants live
                    pieDimension = facts.dimension(function (d) {
                        return d.place;
                    });
                    // Y Axis - count location
                    pieSumGroup = pieDimension.group().reduceCount(function (d) {
                        //console.log(JSON.stringify(d));
                        return d.place;
                    });


                    // ------------------------------------------
                    // define user GENDER dimension - Gender pie chart
                    // X Axis - male or female
                    genderPieDimension = facts.dimension(function (d) {
                        return d.participant.gender;
                    });
                    // Y Axis - count gender of each participant
                    genderPieSumGroup = genderPieDimension.group().reduceCount(function (d) {
                        //console.log(d);
                        return d.participant.gender;
                    });


                    // ------------------------------------------
                    // define user STATE dimension - US state map chart
                    // X Axis - State as 2 letter code
                    var stateDimension = facts.dimension(function (d) {
                        // note state code is part of a larger string that include city and country
                        //alert(d.place);
                        // test parse code at https://jsfiddle.net/vhzf3am3/
                        var stateString = '';

                        if (d.place){
                            stateString = d.place.substr(d.place.length - 5, 2);
                        }
                        
                        //alert(myString);
                        //alert(myString.length);
                        //alert(myString.substr(myString.length - 5, 2));
                        //alert(stateString);
                        return stateString;
                    });
                    // Y Axis - count state for each participant
                    var stateUserCount = stateDimension.group().reduceCount(function (d) {
                        var stateString = d.place.substr(d.place.length - 5, 2);
                        return stateString;
                    });


                    // ------------------------------------------
                    // define user submission DATE dimension - Date line chart
                    // X Axis - Month date
                    var dateUsageDimension = facts.dimension(function (d) {
                        //console.log('usage date');
                        //console.log(d.dtstart);
                        var monthNumber = moment(d.dtstart).get('month');
                        //alert(monthNumber);
                        return d3.time.month(d.dtstart);
                        //return monthNumber;
                    });
                    // Y Axis - count month for each participant
                    var dateUsageCount = dateUsageDimension.group()
                        .reduceCount(function (d) {
                            var monthNumber = moment(d.dtstart).get('month');
                            //return monthNumber;
                            return d.dtstart;
                        });
                    // get min and max date range for chart based on actual data
                    // http://www.codeproject.com/Articles/697043/Making-Dashboards-with-Dc-js-Part-Graphing

                    var dateUsageMinDate = dateUsageDimension.bottom(1)[0].dtstart;
                    console.log(dateUsageMinDate);
                    //console.log('usage max date');
                    var dateUsageMaxDate = dateUsageDimension.top(1)[0].dtstart;
                    //console.log(dateUsageMaxDate);


                    // ------------------------------------------
                    // define TOP USERS by number of submissions - bar chart
                    // X Axis - list of user names
                    var userValue = facts.dimension(function (d) {
                        //console.log(d3.time.second(d.dtstart).getSeconds());
                        //console.log('user');
                        //console.log(d.participant.username);
                        return d.participant.username;
                    });
                    // Y Axis - count of username for each of the participants
                    var userValueGroupCount = userValue.group()
                        .reduceCount(function (d) {
                            return d.participant.username;
                    });
                    // how to get the top # in a group
                    // http://stackoverflow.com/questions/30977987/plotting-top-values-of-a-group-on-dc-js-bar-chart
                    // then pass topUsersGroup to chart
                    var topUsersGroup = getTops(userValueGroupCount, 3);
                    function getTops(source_group, num) {
                        return {
                            all: function () {
                                return source_group.top(num);
                            }
                        };
                    }


                    // ------------------------------------------
                    // define submission DATA TABLE - table
                    // X Axis - list of record ids
                    submissionDimension = facts.dimension(function (d) {
                        return d.id;
                    });



                    // Define the charts passing in the calculated dimensions and groupings 


                    // Demographics ------------------------------

                    


                    // USER LOCATION (top locations) pie chart
                    placePieChart
                        .width(375)
                        .height(150)
                        .slicesCap(5)
                        .dimension(pieDimension)
                        .legend(dc.legend())

                        .group(pieSumGroup) // by default, pie charts will use group.key as the label
                        
                        


                    // USER GENDER pie chart
                    genderPieChart
                          .width(275)
                          .height(250)
                          .slicesCap(5)
                          .dimension(genderPieDimension)
                          .group(genderPieSumGroup) // by default, pie charts will use group.key as the label
                          .renderLabel(true)
                          .title(function (d) {
                              // parse city from place string - http://stackoverflow.com/questions/13341016/get-first-and-rest-of-string-from-comma-separated-values-in-javascript
                              
                              var percent = (d.value / facts.groupAll().reduceCount().value() * 100).toFixed(0) + "%";
                              return d.key + '  (' + d.value + ' - ' + percent + ')';   // found by looking at log in console !@#
                          })
                          .label(function (d) {
                              //console.log('label');
                              //console.log(d);
                              var percent = (d.value / facts.groupAll().reduceCount().value() * 100).toFixed(0) + "%";
                              return d.key + ' ' + percent + '';   // found by looking at log in console !@#
                          });

                     


                    // US Map chart - user count by state
                    // Note: removed .colors property from example - wasn't working - without it, d3 colors by default
                    usChoroplethChart.width(495)
                          .height(250)
                          .dimension(stateDimension)
                          .group(stateUserCount)
                          .colorCalculator(function (d) { return d ? usChoroplethChart.colors()(d) : '#ddd'; })
                          .overlayGeoJson(statesJson.features, "state", function (d) {
                              return d.properties.name;
                          })
                          .title(function (d) {
                              //alert(d);
                              return "State: " + d.key + "- \nCount: " + (d.value || 0);
                          });

                    // create a projection from d3
                    var albers=d3.geo.albersUsa();
                    albers.scale(550).translate([250,125]);
                    usChoroplethChart.projection(albers); //these are sample numbers, will make the map about half the size

                    
                    //var color = d3.scaleThreshold().domain(d3.range(2, 10)).range(d3.schemeBlues[9]);

                    // Usage ---------------------------------

                    // submission line chart
                    //d3 time formatting - https://github.com/d3/d3/wiki/Time-Formatting
                    // Notes: elasticX because x domain set to use min/max values
                    subLineChart.width(800)
                          .height(150)
                          .margins({ top: 10, right: 10, bottom: 20, left: 40 })
                          .dimension(dateUsageDimension)
                          .group(dateUsageCount)
                          .transitionDuration(500)
                          .xAxisLabel('')
                          .yAxisLabel('Count')
                          .renderHorizontalGridLines(true)
                          .elasticY(true)
                          .x(d3.time.scale().domain([dateUsageMinDate, dateUsageMaxDate]))
                          .xAxis().ticks(d3.time.months).tickFormat(d3.time.format("%b-%Y"));


                
                    // setup the datatable chart
                    //http://dc-js.github.io/dc.js/docs/html/dc.dataTable.html
                    // Note: Pagination is not included in this demo, but can be done - see http://dc-js.github.io/dc.js/examples/table-pagination.html

                              chart.dimension(submissionDimension)
                                  .group(function (d) {
                                      return ""
                                  })
                                .size(Infinity)
                               .columns([
                  
                                   function (d) { return d.dtstartformatted; },
                                   function (d) { return d.device_id; },
                                   function (d) { return d.place; },
                                   // map link from https://leanpub.com/D3-Tips-and-Tricks/read#leanpub-auto-crossfilter-dcjs-and-d3js-for-data-discovery
                                   function (d) {
                                       return '<a href=\"http://maps.google.com/maps?z=12&t=m&q=loc:' +
                                           d.lat + '+' + d.long + "\" target=\"_blank\">Google Map</a>"
                                   }

                               ])
                               .sortBy(function (d) { return d.dtstart; })
                               .order(d3.descending);

                    update();                    
                    dc.renderAll();
                    $.unblockUI();

                }); // d3.json us-states.json

            }) // d3.json()



        } // LoadDataAndRenderCharts()


        // utility method to debug JavaScript - displays properties of an object
        //http://stackoverflow.com/questions/5357442/how-to-inspect-javascript-objects
        function xinspect(o, i) {
            if (typeof i == 'undefined') i = '';
            if (i.length > 50) return '[MAX ITERATIONS]';
            var r = [];
            for (var p in o) {
                var t = typeof o[p];
                r.push(i + '"' + p + '" (' + t + ') => ' + (t == 'object' ? 'object:' + xinspect(o[p], i + '  ') : o[p] + ''));
            }
            return r.join(i + '\n');
        }


        // add a click event handler to the download button (identified via ID)
        // Uses the filesaver library - https://github.com/eligrey/FileSaver.js/
        d3.select('#download')
            .on('click', function () {
                var blob = new Blob([d3.csv.format(submissionDimension.top(Infinity))], { type: "text/csv;charset=utf-8" });
                saveAs(blob, 'ResearchNetData.csv');
            });


        // Define a function to start the execution (arbitrarily called StartExecution)
        // This way of declaring this function allows the method StartExecution to be callable
        // from outside the jQuery .ready() function which would otherwise limit the scope to be callable only
        // within the ready() function. In order words, it makes the scope of the method global.
        // This is done so the method is callable when the user clicks Refresh Data button on the page.
        //http://stackoverflow.com/questions/2379529/how-to-call-a-function-within-document-ready-from-outside-it
        window.StartExecution = function () {

            
            // display loading message - http://malsup.com/jquery/block/
            // The message will automatically display here and undisplay when the ajax calls are complete :-)

            //$(document).ajaxStart($.blockUI).ajaxStop($.unblockUI);
            $.blockUI({ message: null });

            LoadDataAndRenderCharts();
            
        }


        // start execution of the script
        StartExecution();




    }); //$(document).ready(function () {


     

     var ofs = 0, pag = 12;
      function display() {
          d3.select('#begin')
              .text(ofs);
          d3.select('#end')
              .text(ofs+pag-1);
          d3.select('#last')
              .attr('disabled', ofs-pag<0 ? 'true' : null);
          d3.select('#next')
              .attr('disabled', ofs+pag>=facts.size() ? 'true' : null);
          d3.select('#size').text(facts.size());
      }
      function update() {
          chart.beginSlice(ofs);
          chart.endSlice(ofs+pag);
          display();
      }
    function next(){
        ofs += pag;
        update();
        chart.redraw();
    }
      function last() {
          ofs -= pag;
          update();
          chart.redraw();
      }      

