// Interneuron Observation App
// Copyright(C) 2019  Interneuron CIC
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
// See the
// GNU General Public License for more details.
// You should have received a copy of the GNU General Public License
// along with this program.If not, see<http://www.gnu.org/licenses/>.
import * as d3 from "d3";
import { AppService } from '../services/app.service';
import { SubjectsService } from '../services/subjects.service';
import { Observationevent, deviceDisplayName } from '../models/observations.model';
import { log } from 'util';


type Observation = { "units": string, "hasbeenammended": boolean, "observationvalue": any, guidance?: string };
type WarnignScore = { units: null, guidance: string, hasbeenammended: boolean, observationvalue: number }
type ObservationParameterGraph = { chart_id: string, chartname: string, graph_id: string, graphname: string, units: string, graphtype: string, parameterkey: string[], chartgraphorder: number, parameterdomain: number[], secondaryparameterdomain: number[], ordinalparameterdomain: number[], ewsbandingrange: number[], parameterlabelsdomain: number[], scale: string[] };
type GraphObservationData = { observationevent_id: string, person_id: string, datestarted: string, datefinished: string, username: string, userid: number, isamended: boolean, earlywarningscore: WarnignScore, respirations: Observation, oxygensaturations: Observation, isonoxygen: Observation, device: string, systolicbloodpressure: Observation, diastolicbloodpressure: Observation, pulse: Observation, consciousness: Observation, temperature: Observation, painscore: number, glucose: number, bowelsopen: boolean, monitoring: boolean, hasbeenescalated: boolean, height: number, weight: number };
type LineCoordinates = { x: number, y: number }[];
//const parseServerDate = d3.timeParse("%Y-%m-%dT%H:%M:%S.%L");
const getInitialsFromUserName = function (d) { return d.split(" ").reverse().map((n) => n[0]).join(".") };
var dataWasTapped = false;
var ammendSymbolDataPointPath = d3.symbol().type(d3.symbolWye);
var symbolDataPointPath = d3.symbol().type(d3.symbolCircle);
var symbolSystolicBloodPressureDataPointPath = d3.symbol().type(d3.symbolTriangle);
var symbolDiastolicBloodPressureDataPointPath = symbolSystolicBloodPressureDataPointPath;

export class ObservationGraph {
  public yParameterScale: any;
  public yParameterLabelsScale: any;
  public yParameterAxis: any;
  private dataPointSize: number;
  private amendedDataPointSize: number;

  constructor(private xDateGUIDScale: any, private chartSvg: any, private observationParameterGraph: ObservationParameterGraph, private observationParameterRange: number[], private subjects: SubjectsService, private appService: AppService, private isValueAmendable: boolean) {
    this.xDateGUIDScale = xDateGUIDScale;
    this.chartSvg = chartSvg;
    this.observationParameterGraph = observationParameterGraph;
    this.observationParameterRange = observationParameterRange;
    this.yParameterLabelsScale = d3.scaleOrdinal().domain(this.observationParameterGraph.parameterlabelsdomain).range(this.observationParameterRange);
    this.yParameterAxis = d3.axisLeft(this.yParameterLabelsScale).tickSizeOuter(0);

    //------------------------------------------------------------------------------------------------------------------------------
    //Create the scales
    //------------------------------------------------------------------------------------------------------------------------------

    switch (this.observationParameterGraph.graphtype) {
      case "Threshold": {
        this.yParameterScale = d3.scaleThreshold()
          .domain(this.observationParameterGraph.parameterdomain)
          .range(this.observationParameterRange);
        break;
      }
      case "Ordinal": {
        this.yParameterScale = d3.scaleOrdinal()
          .domain(this.observationParameterGraph.ordinalparameterdomain)
          .range(this.observationParameterRange);
        break;
      }
      default: {
        //this.appService.logToConsole('END OF SWITCH STATEMENT reached for graphtype: ' + this.observationParameterGraph.graphtype);
        break;
      }
    }
  }

  //------------------------------------------------------------------------------------------------------------------------------
  //Draw the chart one chart at a time
  //------------------------------------------------------------------------------------------------------------------------------

  drawGraph(graphXPosition: number, graphYPosition: number, graphWidth: number, numberOfColumnsInTheChart: number) {
    let columnWidth = graphWidth / numberOfColumnsInTheChart;
    this.dataPointSize = columnWidth * 1.0;
    this.amendedDataPointSize = this.dataPointSize * 1.6;
    let parameterRowHeight = columnWidth * 0.8;
    let parameterGraphHeight = parameterRowHeight * (this.observationParameterGraph.parameterlabelsdomain.length);
    let parameterLabelWidth = graphXPosition * 0.54;
    let adjustedBandingYPosition = graphYPosition - (parameterRowHeight / 2);
    this.appService.logToConsole("columnWidth = " + columnWidth);

    d3.select("body").on("click", () => {
      this.cleanUpTooltips()
    });

    // yAxis Labels
    this.chartSvg.append("g").attr("class", "yAxis " + this.observationParameterGraph.graph_id + "Graph")
      .attr("transform", "translate(" + (graphXPosition + columnWidth * 0.2) + ",0)")
      .call(this.yParameterAxis).selectAll(".tick text");

    this.chartSvg.append("g").append("rect")
      .attr("class", "label")
      .attr("x", 0)
      .attr("y", graphYPosition)
      .attr("width", parameterLabelWidth + 15) // IJ: added some extra width to give some space after the text. Needs review
      .attr("height", parameterGraphHeight);

    this.chartSvg.append("g").append("text")
      .attr("class", "keyText")
      .attr("x", 0)
      .attr("y", adjustedBandingYPosition + parameterRowHeight / 4)
      .attr("dy", "1.6vw")
      .text(() => {
        var text = this.observationParameterGraph.graphname + " " + (this.observationParameterGraph.units == null ? "" : this.observationParameterGraph.units);
        if (this.observationParameterGraph.graph_id == "oxygensaturations") {
          text = text + " Scale 1";
        } else if (this.observationParameterGraph.graph_id == "copdcombinedoxygensaturations") {
          text = text + " Scale 2";
        }
        return text + "  ";
      })
      .style("text-anchor", "start")
      .style("alignment-baseline", "central")
      .call(this.wrap, parameterLabelWidth + 15); // IJ: added some extra width to give some space after the text. Needs review

    // Draw the graph
    switch (this.observationParameterGraph.graphtype) {
      case "Threshold": {

        //Add EWS banding
        this.observationParameterRange.forEach((yValue, index) => {
          var prevXPos = graphXPosition;
          for (var i = 0; i < numberOfColumnsInTheChart; i++) {
            this.appendGraphCellBackground(this.chartSvg, prevXPos, yValue - (parameterRowHeight / 2), graphWidth / numberOfColumnsInTheChart, parameterRowHeight, ("score" + this.observationParameterGraph.ewsbandingrange[index] + " X" + Math.ceil(prevXPos + (columnWidth / 2)) + " Y" + Math.ceil(yValue)));
            prevXPos = prevXPos + graphWidth / numberOfColumnsInTheChart;
          }
        });

        // Add EWS key
        this.observationParameterRange.forEach((yValue, index) => {
          this.chartSvg.append("rect")
            .attr("class", "key" + this.observationParameterGraph.ewsbandingrange[index])
            .attr("x", graphXPosition + graphWidth + columnWidth * 0.7)
            .attr("y", this.yParameterLabelsScale(yValue) - (parameterRowHeight * 0.46))
            .attr("width", columnWidth * 0.8)
            .attr("height", parameterRowHeight * 0.94);

          this.chartSvg.append("text")
            .attr("class", "keyText" + this.observationParameterGraph.ewsbandingrange[index])
            .attr("x", graphXPosition + graphWidth + columnWidth * 0.95)
            .attr("y", this.yParameterLabelsScale(yValue) + (parameterRowHeight * 0.2))
            .text("" + this.observationParameterGraph.ewsbandingrange[index]);
        });
        break;
      }
      case "Ordinal": {
        if (this.observationParameterGraph.ewsbandingrange.length != 0) {
          //Add EWS banding
          this.observationParameterRange.forEach((yValue, index) => {
            var prevXPos = graphXPosition;
            for (var i = 0; i < numberOfColumnsInTheChart; i++) {
              this.appendGraphCellBackground(this.chartSvg, prevXPos, yValue - (parameterRowHeight / 2), graphWidth / numberOfColumnsInTheChart, parameterRowHeight, ("score" + this.observationParameterGraph.ewsbandingrange[index] + " X" + Math.ceil(prevXPos + (columnWidth / 2)) + " Y" + Math.ceil(yValue)));
              prevXPos = prevXPos + graphWidth / numberOfColumnsInTheChart;
            }
          });

          // Add EWS key
          this.observationParameterRange.forEach((yValue, index) => {
            this.chartSvg.append("rect")
              .attr("class", "key" + this.observationParameterGraph.ewsbandingrange[index])
              .attr("x", graphXPosition + graphWidth + columnWidth * 0.7)
              .attr("y", this.yParameterLabelsScale(yValue) - (parameterRowHeight * 0.46))
              .attr("width", columnWidth * 0.8)
              .attr("height", parameterRowHeight * 0.94);

            this.chartSvg.append("text")
              .attr("class", "keyText" + this.observationParameterGraph.ewsbandingrange[index])
              .attr("x", graphXPosition + graphWidth + columnWidth * 0.95)
              .attr("y", this.yParameterLabelsScale(yValue) + (parameterRowHeight * 0.2))
              .text("" + this.observationParameterGraph.ewsbandingrange[index]);
          });
        }
        break;
      }
      default: {
        //this.appService.logToConsole('End of switch statement reached for graphtype: ' + this.observationParameterGraph.graphtype);
        break;
      }
    }

    this.drawVerticalLines(this.chartSvg, graphXPosition, graphYPosition, parameterGraphHeight, columnWidth, numberOfColumnsInTheChart + 1, this.observationParameterGraph.graphname + "ChartVerticalLine");
    this.drawHorizontalLines(this.chartSvg, graphXPosition, graphYPosition, graphWidth, parameterRowHeight, this.observationParameterGraph.parameterlabelsdomain.length + 1, this.observationParameterGraph.graphname + "ChartHorizontalLine");
  }

  //------------------------------------------------------------------------------------------------------------------------------
  //Add the data
  //------------------------------------------------------------------------------------------------------------------------------

  addData(observationData: GraphObservationData[]) { // Called for each graph 
    //add the data points
    let graphSvg = this.chartSvg.append("g");

    // loop through each graph for each data parameter key on that graph 
    for (let index = 0; index < this.observationParameterGraph.parameterkey.length; index++) {

      switch (this.observationParameterGraph.graphtype) {
        case "Threshold": {

          var parameterDataPointCoordinates: LineCoordinates = []; //save data point coordinates

          graphSvg.selectAll("path." + this.observationParameterGraph.parameterkey[index])
            .data(observationData.filter((d) => { // loop though each observation event for a given graph parameter

              //get the parameterDataPointCoordinates and join the dots
              if (d[this.observationParameterGraph.parameterkey[index]] != null && d[this.observationParameterGraph.parameterkey[index]].observationvalue != null && this.observationParameterGraph.scale.includes(d["scale"])) {
                if (d["isonoxygen"] != null && d["isonoxygen"].observationvalue && this.observationParameterGraph.graph_id == "copdcombinedoxygensaturations") {

                  let copdcombinedoxygensaturationsYScale = d3.scaleThreshold()
                    .domain(this.observationParameterGraph.secondaryparameterdomain)
                    .range(this.observationParameterRange);

                  parameterDataPointCoordinates.push({ x: this.xDateGUIDScale(d.observationevent_id), y: copdcombinedoxygensaturationsYScale(d[this.observationParameterGraph.parameterkey[index]].observationvalue) });
                } else {
                  parameterDataPointCoordinates.push({ x: this.xDateGUIDScale(d.observationevent_id), y: this.yParameterScale(d[this.observationParameterGraph.parameterkey[index]].observationvalue) });

                }
              } else {
                // if there is a break in the data - join the dots and break the line
                this.joinTheDots(graphSvg, parameterDataPointCoordinates, "trendLine", this.observationParameterGraph.parameterkey[index]);
                parameterDataPointCoordinates = [];
              }
              return d[this.observationParameterGraph.parameterkey[index]] != null && this.observationParameterGraph.scale.includes(d["scale"]);
            }))
            .enter()
            .append("path") // draw the data point
            .attr("class", (d, i) => {
              return "dataPoint " + this.observationParameterGraph.parameterkey[index];
            })
            .attr("d", (d) => {
              var dataPointSymbol = symbolDataPointPath.size(this.dataPointSize)();

              if (d[this.observationParameterGraph.parameterkey[index]].hasbeenammended) {
                dataPointSymbol = ammendSymbolDataPointPath.size(this.amendedDataPointSize)();
              } else {
                if (this.observationParameterGraph.parameterkey[index] == 'systolicbloodpressure' || this.observationParameterGraph.parameterkey[index] == 'diastolicbloodpressure') {
                  dataPointSymbol = symbolSystolicBloodPressureDataPointPath.size(this.dataPointSize)();
                }
              };

              return dataPointSymbol;
            })
            .attr("transform", (d, i) => {
              const x = this.xDateGUIDScale(d.observationevent_id);
              var y;
              var rotation = 180;

              if (d["isonoxygen"] != null && d["isonoxygen"].observationvalue && this.observationParameterGraph.graph_id == "copdcombinedoxygensaturations") {

                let copdcombinedoxygensaturationsYScale = d3.scaleThreshold()
                  .domain(this.observationParameterGraph.secondaryparameterdomain)
                  .range(this.observationParameterRange);

                y = copdcombinedoxygensaturationsYScale(d[this.observationParameterGraph.parameterkey[index]].observationvalue);
              } else {
                y = this.yParameterScale(d[this.observationParameterGraph.parameterkey[index]].observationvalue);
              }

              if (this.observationParameterGraph.parameterkey[index] == 'diastolicbloodpressure') {
                rotation = 0;
                y = y + this.amendedDataPointSize * 0.09;
              } else if (this.observationParameterGraph.parameterkey[index] == 'systolicbloodpressure') {
                y = y - this.amendedDataPointSize * 0.09;
              }

              return "translate(" + x + "," + y + ") rotate(" + rotation + ")";
            })
            .on("click", (d) => {
              const observation: Observation = { units: this.observationParameterGraph.units, hasbeenammended: d[this.observationParameterGraph.parameterkey[index]].hasbeenammended, observationvalue: d[this.observationParameterGraph.parameterkey[index]].observationvalue };
              this.dataTapped(observation, d.observationevent_id, this.observationParameterGraph.parameterkey[index]);
              return;
            });

          this.joinTheDots(graphSvg, parameterDataPointCoordinates, "trendLine", this.observationParameterGraph.parameterkey[index]);
        }
          break;
        case "Ordinal": {
          var text = ""
          graphSvg.selectAll("text.value." + this.observationParameterGraph.parameterkey[index])
            .data(observationData.filter((d) => { // loop though each observation event for a given graph parameter
              //this.appService.logToConsole("d[this.observationParameterGraph.parameterkey[index]].observationvalue = "+d[this.observationParameterGraph.parameterkey[index]].observationvalue);
              return d[this.observationParameterGraph.parameterkey[index]] != null;
            }))
            .enter()
            .append("text") // draw the data point
            .attr("class", (d, i) => {
              var classname = "" + this.observationParameterGraph.parameterkey[index];
              if (!d[this.observationParameterGraph.parameterkey[index]].hasbeenammended) {
                classname = "value " + classname;

              } else {
                classname = "value ammended " + classname;
              };
              return classname;
            })
            .text((d) => {
              //logic for specific ordinal charts

              const observationObject = d[this.observationParameterGraph.parameterkey[index]];

              if (observationObject != null) {
                if (observationObject.observationvalue != null) {
                  text = observationObject.observationvalue;
                }
              }

              switch (this.observationParameterGraph.graph_id) {
                case "isonoxygen":
                  if (observationObject.observationvalue == false) { text = "A" } else {
                    text = "";
                  };
                  break;
                case "oxygenflow":
                  text = text + (text ? "L" : "");
                  break;
                case "oxygenpercentage":
                  text = text + (text ? "%" : "");
                  break;
                case "recordedby": {
                  text = getInitialsFromUserName(observationObject);
                  break;
                }
                case "device": {
                  //  text = deviceDisplayName[observationObject.observationvalue];
                  //  text = observationObject.observationvalue;
                }
                  break;
                case "bowelsopen":
                case "escalationofcare": {
                  switch (observationObject.observationvalue) {
                    case false:
                      text = "N";
                      break;
                    case true:
                      text = "Y";
                      break;
                    default:
                      text = "";
                      break;
                  }
                  break;
                }

                default: {
                  //this.appService.logToConsole('END OF SWITCH STATEMENT reached for graph_id: ' + this.observationParameterGraph.graph_id);
                  break;
                }
              };

              return text;
            })
            .attr("x", (d, i) => { return this.xDateGUIDScale(d.observationevent_id); })
            .attr("y", (d, i) => {
              return this.yParameterScale(d[this.observationParameterGraph.parameterkey[index]].observationvalue);
            })
            .style("text-anchor", "middle")
            .style("alignment-baseline", "middle")
            .attr("transform", (d) => {
              // if (d[this.observationParameterGraph.parameterkey[index]].hasbeenammended) {
              //   const classString = "rect." + "X" + Math.ceil(this.xDateGUIDScale(d.observationevent_id)) + ".Y" + Math.ceil(this.yParameterScale(d[this.observationParameterGraph.parameterkey[index]].observationvalue));
              //   var rect = d3.selectAll(classString);

              //   rect.attr("class", "hasbeenamended");
              //   this.appService.logToConsole(classString);
              //   this.appService.logToConsole(rect);
              // };

              if (this.observationParameterGraph.parameterkey[index] == "earlywarningscore") {
                const classString = "rect." + "X" + Math.ceil(this.xDateGUIDScale(d.observationevent_id)) + ".Y" + Math.ceil(this.yParameterScale(d[this.observationParameterGraph.parameterkey[index]].observationvalue));
                var rect = d3.selectAll(classString);
                var value = d[this.observationParameterGraph.parameterkey[index]].observationvalue;
                var ewsClassString = d[this.observationParameterGraph.parameterkey[index]].guidance.split(" ")[0];
                if (ewsClassString == "LOW/MEDIUM") {
                  ewsClassString = "LOW-MEDIUM";
                }
                this.appService.logToConsole(ewsClassString);
                rect.attr("class", "EWS_" + ewsClassString);
              }


              return "translate(0,0)";
            })
            .on("click", (d) => {
              const observation: Observation = { units: this.observationParameterGraph.units, hasbeenammended: d[this.observationParameterGraph.parameterkey[index]].hasbeenammended, observationvalue: d[this.observationParameterGraph.parameterkey[index]].observationvalue, guidance: d[this.observationParameterGraph.parameterkey[index]].guidance };
              this.dataTapped(observation, d.observationevent_id, this.observationParameterGraph.parameterkey[index]);
            });
        }
          break;
      }
    }
    this.addDataLinesForBloodPressure(observationData);
  }

  addDataLinesForBloodPressure(observationData: GraphObservationData[]) { // called for each graph

    let graphBloodPressureLineSvg = this.chartSvg.append("g");
    var parameterDataPointCoordinates: LineCoordinates = []; //save data point coordinates

    if (this.observationParameterGraph.parameterkey[0] == 'systolicbloodpressure') {
      observationData.forEach(d => {
        if (d[this.observationParameterGraph.parameterkey[0]] && d[this.observationParameterGraph.parameterkey[1]]) {
          parameterDataPointCoordinates.push({ x: this.xDateGUIDScale(d.observationevent_id), y: this.yParameterScale(d[this.observationParameterGraph.parameterkey[0]].observationvalue) });
          parameterDataPointCoordinates.push({ x: this.xDateGUIDScale(d.observationevent_id), y: this.yParameterScale(d[this.observationParameterGraph.parameterkey[1]].observationvalue) });
          this.joinTheDots(graphBloodPressureLineSvg, parameterDataPointCoordinates, "verticalLine", "bloodPressure");
          parameterDataPointCoordinates = [];
        }
      });
    }
  }

  //------------------------------------------------------------------------------------------------------------------------------
  //Helper functions
  //------------------------------------------------------------------------------------------------------------------------------

  lineGenerator = d3.line().x(function (d, i) { return d.x; }).y(function (d, i) { return d.y; }).curve(d3.curveLinear); //draws the lines between the dots


  drawVerticalLines(chartGroup, x, y, chartHeight, columnWidth, numberOfLines, classOfLine) {
    for (let i = 0; i < numberOfLines; i++) {
      var verticalLineDataPoints = [];
      var dx = x + (i * columnWidth);
      var dy = y + chartHeight;
      verticalLineDataPoints.push({ x: dx, y: y });
      verticalLineDataPoints.push({ x: dx, y: dy });

      chartGroup.append("path")
        .attr("class", classOfLine)
        .attr("stroke", "black")
        .attr("d", this.lineGenerator(verticalLineDataPoints));
    }
  }

  drawHorizontalLines(chartGroup, x, y, graphWidth, rowHeight, numberOfLines, classOfLine) {
    for (let i = 0; i < numberOfLines; i++) {
      var horizontalLineDataPoints = [];
      var dx = x + graphWidth;
      var dy = y + (i * rowHeight);
      horizontalLineDataPoints.push({ x: x, y: dy });
      horizontalLineDataPoints.push({ x: dx, y: dy });

      chartGroup.append("path")
        .attr("class", classOfLine)
        .attr("stroke", "black")
        .attr("d", this.lineGenerator(horizontalLineDataPoints));
    }
  }

  wrap(text, width) {
    text.each(function () {
      var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 1).attr("y", y).attr("dy", dy + "em");
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = text.append("tspan").attr("x", 1).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
        }
      }
    });
  }

  joinTheDots(group: any, lineCoordinates: LineCoordinates, className: string, name: string) {
    group.append("path")
      .attr("class", className + " " + name)
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("d", this.lineGenerator(lineCoordinates));
  };

  dataTapped(observation: Observation, observationevent_id: string, name: string): void {
    dataWasTapped = true;
    var tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0).style("position", "absolute");
    tooltip.style("opacity", 1).style("left", d3.event.pageX - this.dataPointSize * 0.77 + "px").style("top", d3.event.pageY - this.dataPointSize * 2.4 + "px");
    var value = observation.observationvalue != null ? observation.observationvalue : ""
    if (value === true) { value = "Yes" } else if (value === false) { value = "No" };
    //
    const units = observation.units != null ? observation.units : "";
    var linkText;
    if (name == "earlywarningscore") {
      linkText = "guidance";
    }
    else if (observation.hasbeenammended) {
      linkText = "history";
    }
    else if (this.isValueAmendable) {
      linkText = "amend"
    }
    else {
      linkText = "";
    }

    tooltip.html(value + " " + units + "<div><a id='toolTipButton' href='#'>" + linkText + "</a></div>");
    tooltip.select("#toolTipButton")
      .on("click", () => {
        dataWasTapped = true;
        this.launchPopover(observationevent_id, name, value, units, linkText, observation.guidance);
        //this.appService.logToConsole("label was clicked");
        return;
      });
  }

  launchPopover(observationevent_id, name, observationvalue, units, linkText, ewsguidance) {
    if (name == "earlywarningscore") {
      this.subjects.openGuidance.next({ score: observationvalue, observationevent_id: observationevent_id, guidance: ewsguidance });

    }
    else {
      if (linkText == "amend") {
        this.subjects.openObsForm.next("Amend Observations");
        this.subjects.amendObs.next(observationevent_id);
      }
      else
        this.subjects.openPopover.next({
          "observationevent_id": observationevent_id,
          "name": name,
          "value": observationvalue,
          "units": units
        });
    }
  }

  cleanUpTooltips() {
    var activeToolTip = d3.selectAll('.tooltip');
    if (!dataWasTapped) {
      // this.appService.logToConsole("body - dataWasNOTtapped")
      d3.selectAll('.tooltip').remove();
    } else if (activeToolTip.size() > 1) {
      d3.select('.tooltip').remove();
      dataWasTapped = false;
    } else {
      dataWasTapped = false;
    };
  }


  appendGraphCellBackground(chartSvg: any, x: number, y: number, width: number, height: number, classname: string) {

    chartSvg.append("rect")
      .attr("class", classname)
      .attr("x", x)
      .attr("y", y)
      .attr("width", width)
      .attr("height", height);

  }
}
