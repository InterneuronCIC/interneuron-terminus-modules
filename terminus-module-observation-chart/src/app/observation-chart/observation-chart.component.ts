/* Interneuron Observation App
Copyright(C) 2019  Interneuron CIC
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
See the
GNU General Public License for more details.
You should have received a copy of the GNU General Public License
along with this program.If not, see<http://www.gnu.org/licenses/>. */
import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, ViewEncapsulation, HostListener, OnDestroy } from '@angular/core';
import { ObservationGraph } from './observation-graph';
import * as d3 from "d3";
import { ApirequestService } from '../services/apirequest.service';
import { filters, filterParams, filterparam, selectstatement, orderbystatement, filter } from '../models/Filter.model';
import { SubjectsService } from '../services/subjects.service';
import { AppService } from '../services/app.service';
import { Subscription } from 'rxjs';
import * as moment from 'moment';

@Component({
  selector: 'app-observation-chart',
  templateUrl: './observation-chart.component.html',
  styleUrls: ['./observation-chart.component.css'],
  encapsulation: ViewEncapsulation.None

})
export class ObservationChartComponent implements AfterViewInit, OnDestroy {
  ngAfterViewInit(): void {
    const element = this.chartHolder.nativeElement;
    //this.tooltip = d3.select(element).append("div").style("opacity", "0").style("position", "absolute");

    //this.appService.logToConsole(this.parseServerDate);
  }

  @ViewChild('yAxisHolder')
  private yAxisHolder: ElementRef;

  @ViewChild('xAxisHeader')
  private xAxisHeader: ElementRef;


  @ViewChild('gh')
  private graphHolder: ElementRef;


  @ViewChild('chartHolder')
  private chartHolder: ElementRef;

  @ViewChild('observationChartWrapper')
  private observationChartWrapper: ElementRef;

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    //this.appService.logToConsole("resized");
    this.cleanUpTooltips();
    this.drawChart();
  }

  @HostListener("window:scroll", [])
  onWindowScroll() {
    //var dateTimeAxisHeaderSVG = document.getElementById("xDateTimeAxis");
    var y = scrollY;

    //dateTimeAxisHeaderSVG.setAttribute("transform", "translate("+ 0+ "," + y + ")");

    //this.appService.logToConsole("Scroll Event", y);
  };

  graphchart: any; //"./assets/meta_graphcharts.json";
  graphdata: any; //"./assets/data24.json";
  chartPage: number = 0;
  dataStartIndex: number;
  dataEndIndex: number;
  numberOfColumnsInTheChart = 18; // minimum 10
  numberOfPagesInChart: number;
  subscriptions: Subscription = new Subscription();

  tickLabelDateTimeFormat(d: Date) {
    if (!d) return "";
    else return ("0" + d.getHours()).slice(-2)
      + ":"
      + ("0" + d.getMinutes()).slice(-2)
      + " "
      + ("0" + d.getDate()).slice(-2)
      + "/"
      + ("0"
        + (d.getMonth() + 1)).slice(-2)
      + "/"
      + (" " + (d.getFullYear())).slice(-2)
  };


  lineGenerator = d3.line().x(function (d, i) { return d.x; }).y(function (d, i) { return d.y; }).curve(d3.curveLinear); //draws the lines between the dots

  isValueAmendable: boolean = false;

  constructor(private apiRequest: ApirequestService, private subjects: SubjectsService, private appService: AppService) {

    this.subscriptions.add(this.subjects.drawGraph.subscribe(() => {
      this.graphdata = null;
      this.isValueAmendable = this.appService.isCurrentEncouner;
      //this.drawChart();
      this.getData();
    }));


  }
  ngOnDestroy() {
    this.appService.logToConsole("destroying Observations chart");
    this.subscriptions.unsubscribe();
  }

  getData() {
    this.appService.logToConsole("getting data");
    //get graph json this.appService.baseURI + "/GetBaseViewList/meta_graphcharts
    this.subscriptions.add(this.apiRequest.getRequest("./assets/meta_graphcharts.json").subscribe(
      (response) => {
        this.graphchart = response;

        // get data json
        this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/carerecord_observations", this.createObservationsFilter()).subscribe(
          (response) => {
            let responseArray = JSON.stringify(response);
            let cleanJson = responseArray.replace(/"{/g, '{').replace(/}\"/g, '}').replace(/\\"/g, '"');
            // console.warn(responseArray.replace(/"{/g, '{').replace(/}\"/g, '}').replace(/\\"/g, '"'));
            //this.appService.logToConsole(JSON.parse(cleanJson));
            this.graphdata = JSON.parse(cleanJson);
            //for (var i in this.graphdata) {
            //  if (this.graphdata[i].isonoxygen == null) {
            //    this.graphdata[i].isonoxygen = { observationvalue: false, hasbeenammended: false, units: "" };
            //  }
            //}
            this.appService.logToConsole("got data");
            this.drawChart();
          }));
      }));
  }

  createObservationsFilter() {

    let condition = "person_id=@person_id and encounter_id=@encounter_id";
    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();
    pm.filterparams.push(new filterparam("person_id", this.appService.personId));
    pm.filterparams.push(new filterparam("encounter_id", this.appService.encouter.encounter_id));

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY datefinished desc");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);
    return JSON.stringify(body);
  }

  ngOnInit() {

  }



  //------------------------------------------------------------------------------------------------------------------------------
  //Draw the Chart
  //------------------------------------------------------------------------------------------------------------------------------

  drawChart() {
    this.appService.logToConsole("inside draw chart");
    if (!(this.graphchart && this.graphdata)) {
      this.appService.logToConsole("looks like no data yet");
      //await this.getData();
    }
    else {
      this.appService.logToConsole(this.graphchart);
      this.appService.logToConsole(this.graphdata)
      this.appService.logToConsole("Startign to draw");
      if (!d3.select(this.chartHolder.nativeElement).select("svg").empty()) {
        d3.select(this.chartHolder.nativeElement).select("svg").remove();
        d3.select(this.xAxisHeader.nativeElement).select("svg").remove();
      };

      //chart dimension
      // keep here for so the window will resize
      const maxWidth = 1024;
      //var windowWidth = document.getElementById("observationChartWrapper").offsetWidth > maxWidth ? maxWidth : document.getElementById("observationChartWrapper").offsetWidth;
      var windowWidth = this.observationChartWrapper.nativeElement.offsetWidth > maxWidth ? maxWidth : this.observationChartWrapper.nativeElement.offsetWidth;

      //this.chartHolder.nativeElement.offsetWidth; //1000; // (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth);

      //this.appService.logToConsole("windowWidth" + windowWidth);
      var chartHeight = windowWidth * 2.3; // adjust according to size of graphs
      const ratioOfCellHeightToWidth = 0.8;
      // chartHeight = (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight);

      const yAxisWidth = windowWidth * 0.22;
      const graphWidth = windowWidth * 0.69;

      const columnWidth = graphWidth / this.numberOfColumnsInTheChart;
      const graphXPosition = yAxisWidth; // distance of chart form y axis

      const parameterRowHeight = columnWidth * ratioOfCellHeightToWidth;

      const xDateTimeHolderHeight = parameterRowHeight * 5.0;

      // chart data index
      this.dataStartIndex = (this.chartPage * this.numberOfColumnsInTheChart);
      this.dataEndIndex = this.dataStartIndex + this.numberOfColumnsInTheChart;
      this.numberOfPagesInChart = Math.ceil(this.graphdata.length / this.numberOfColumnsInTheChart) - 1;
      const observationData = this.graphdata.slice(this.dataStartIndex, this.dataEndIndex);
      const chartGraphData = this.graphchart

      //Add the chart svg group
      var headerSvg = d3.select(this.xAxisHeader.nativeElement).append("svg")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", windowWidth)
        .attr("height", xDateTimeHolderHeight);

      var chartSvg = d3.select(this.chartHolder.nativeElement).append("svg")
        .attr("width", windowWidth)
        .attr("height", chartHeight);


      //------------------------------------------------------------------------------------------------------------------------------
      //headerSVG Date Time xAxis
      //------------------------------------------------------------------------------------------------------------------------------

      //Domain and Range
      const datesDomain = [];
      const dateGUIDDomain = [];
      const stringDateArray = [];

      for (let i = 0; i < this.numberOfColumnsInTheChart; i++) {

        var arrayItem = observationData[i];

        if (arrayItem != undefined && arrayItem.datefinished != null) {
          datesDomain.unshift(new Date(moment(arrayItem.datefinished.toString(), moment.ISO_8601).toString())); // push to the start of the array       
          stringDateArray.unshift(arrayItem.datefinished); // push to the start of the array
          dateGUIDDomain.unshift(arrayItem.observationevent_id); // push to the start of the array
        }
      };

      //Column parameters

      const endOfRange = graphXPosition + graphWidth - columnWidth / 2;
      const datesRange = [(endOfRange - ((datesDomain.length - 1) * columnWidth)), endOfRange];

      //xScales

      const xDateGUIDScale = d3.scalePoint().domain(dateGUIDDomain).range(datesRange);

      //xAxis
      const xDateTimeAxis = d3.axisBottom(xDateGUIDScale)
        .ticks(this.numberOfColumnsInTheChart)
        .tickFormat((d) => {
          var index = dateGUIDDomain.indexOf(d);
          var dateObject = datesDomain[index];
          return this.tickLabelDateTimeFormat(dateObject);
        })
        //.attr("class", "red")
        .tickSizeOuter(6);

      // var ff = d3.select('xDateTimeAxis');
      // this.appService.logToConsole(ff);

      // Axis is drawing at the end - so it will appear above the chart

      var chartSvgGroup = headerSvg.append("g")
        .attr("id", "xDateTimeAxis")
        .attr("class", "xDateTimeAxis");

      chartSvgGroup
        .append("rect")
        .attr("class", "dateTimeBackground")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", windowWidth)
        .attr("height", xDateTimeHolderHeight);

      //Generate xAxis of the chart
      chartSvgGroup.call(xDateTimeAxis);

      //Selected all text elements of the x-axis;
      //Split the time and date component and created two new text elements; deleted the original text element
      //time text element is identified by "xAxisTimeComponent" css class; date text element is identified by "xAxisDateComponent" css class;
      chartSvgGroup.selectAll(".tick text").each(function (d) {
        var elParent = d3.select(this.parentNode);
        var el = d3.select(this);
        var words = d3.select(this).text().split(' ');
        el.remove();

        var timeText = elParent.append('text');
        timeText.text(words[0]);
        timeText.attr("class", "xAxisTimeComponent")

        var dateText = elParent.append('text');
        dateText.text(words[1]);
        dateText.attr("class", "xAxisDateComponent");
      });

      //registered onclick event on each text element of the x-axis (both time and date text elements)
      chartSvgGroup.selectAll(".tick text")
      .on("click", (d) => {
        this.dateWasTapped(d);
      });

      //Start of x-axis text alignment w.r.t. the chart
      var timeTextHeight = 0;
      if (d3.select(".xAxisTimeComponent").node()) {
        timeTextHeight = d3.select(".xAxisTimeComponent").node().getBoundingClientRect().height;
      }
      var dateTextHeight = 0;
      if (d3.select(".xAxisDateComponent").node()) {
        dateTextHeight = d3.select(".xAxisDateComponent").node().getBoundingClientRect().height;
      }

      chartSvgGroup.selectAll(".xAxisTimeComponent").attr("transform", "translate(10, " + (xDateTimeHolderHeight - (timeTextHeight)) + ") rotate(" + -45 + ",0," + timeTextHeight + ")");
      chartSvgGroup.selectAll(".xAxisDateComponent").attr("transform", "translate(" + 6 + ", " + (xDateTimeHolderHeight - ((timeTextHeight + dateTextHeight))) + ") rotate(" + -45 + ",0," + (timeTextHeight + dateTextHeight) * -1 + ")");

      // End of x-axis text alignment w.r.t. the chart

      chartSvgGroup.append("path")
        .attr("class", "dateTimeBackground")
        .attr("stroke", "black")
        .attr("d", this.lineGenerator([{ x: 0, y: xDateTimeHolderHeight }, { x: windowWidth, y: xDateTimeHolderHeight }]));

      // Add forward and back buttons
      var buttonWidth = yAxisWidth * 0.8;
      var buttonYPosition = xDateTimeHolderHeight * 0.6;
      var firstButtonXposition = buttonWidth * 0.0625;

      chartSvgGroup.append("svg")
        .attr("x", buttonWidth * 0.0625)
        .attr("y", buttonYPosition)
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 " + buttonWidth + " " + buttonWidth + "")
        .append("path")
        .attr("class", "pagesButton")
        .attr("d", "M 28.5,0.41 C 28.5,0.41 0,16 0,16 L 28.5,31.59 C 28.5,31.59 28.5,28.85 28.5,25 L 51,25 51,7 28.5,7 C 28.5,3.15 28.5,0.41 28.5,0.41 L 28.5,0.41 Z M 28.5,0.41")
        .attr("opacity", () => {
          var opacity = 0;
          if (this.numberOfPagesInChart > 0) {
            opacity = 1;
          }
          return opacity;
        })
        .on("click", () => {
          this.movePageBack();
        });

      chartSvgGroup.append("svg")
        .attr("x", buttonYPosition + firstButtonXposition * 2)
        .attr("y", buttonYPosition)
        .attr("preserveAspectRatio", "xMinYMin meet")
        .attr("viewBox", "0 0 " + buttonWidth + " " + buttonWidth + "")
        .classed("svg-content", true)
        .append("path")
        .attr("class", "pagesButton")
        .attr("d", "M 22.5,0.41 C 22.5,0.41 51,16 51,16 L 22.5,31.59 C 22.5,31.59 22.5,28.85 22.5,25 L 0,25 0,7 22.5,7 C 22.5,3.15 22.5,0.41 22.5,0.41 L 22.5,0.41 Z M 22.5,0.41")
        .attr("opacity", () => {
          var opacity = 0;
          if (this.chartPage > 0) {
            opacity = 1;
          }
          return opacity;
        })
        .on("click", () => {
          this.movePageForward();
        });


      //------------------------------------------------------------------------------------------------------------------------------
      //GraphsYAxis
      //------------------------------------------------------------------------------------------------------------------------------
      // Parameter Domain and Range
      var observationParameterRange = [];

      var lastGraphWasOrdinal = false;

      for (let i = 0; i < chartGraphData.length; i++) { // iterate through the graphs

        var observationParameterGraph = chartGraphData[i];

        var parameterGraphHeight = parameterRowHeight * (observationParameterGraph.parameterlabelsdomain.length);

        var graphYPosition = i == 0 ? parameterRowHeight / 2 : observationParameterRange[0] + parameterRowHeight; // first graph distance from header


        if (observationParameterGraph.graphtype == "Ordinal") {
          if (lastGraphWasOrdinal) {
            graphYPosition = observationParameterRange[0] + parameterRowHeight * 0.5;
          } else {
            lastGraphWasOrdinal = true;
          }
        } else {
          lastGraphWasOrdinal = false;
        };

        var adjustedBandingYPosition = graphYPosition - (parameterRowHeight / 2);

        observationParameterRange = [];

        for (let i = 0; i < observationParameterGraph.parameterlabelsdomain.length; i++) {
          observationParameterRange.push(adjustedBandingYPosition + parameterGraphHeight - (i * (parameterRowHeight)));
        };

        let parameterGraph = new ObservationGraph(xDateGUIDScale, chartSvg, observationParameterGraph, observationParameterRange, this.subjects, this.appService, this.isValueAmendable);

        parameterGraph.drawGraph(graphXPosition, graphYPosition, graphWidth, this.numberOfColumnsInTheChart);

        parameterGraph.addData(observationData);

      };

    }
  } //closes drawChar()

  movePageBack() {
    //this.appService.logToConsole("movePageBack this.chartPage " + this.chartPage);
    //this.appService.logToConsole("this.numberOfPagesInChart " + this.numberOfPagesInChart);

    if (this.chartPage < this.numberOfPagesInChart) {
      this.chartPage++;
      this.drawChart();
    }

  };

  movePageForward() {
    // this.appService.logToConsole("movePageForward this.chartPage " + this.chartPage);
    if (this.chartPage > 0) {
      this.chartPage--;
      this.drawChart();
    }
  }

  dateWasTapped(d) {
    if (d) {
      this.subjects.openDeletePopover.next(d);
    }
  }

  cleanUpTooltips() {
    var activeToolTip = d3.selectAll('.tooltip').remove();
  };
}
