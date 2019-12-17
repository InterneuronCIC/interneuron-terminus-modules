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
import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { SubjectsService } from '../services/subjects.service';
import { Observationevent, Observation, Observationtype, obsNamesFromChart, obsNameHeadersFromChart, deviceDisplayName, consciousLevelDisplayName } from '../models/observations.model';
import { ApirequestService } from '../services/apirequest.service';
import { Subscription } from 'rxjs';
import * as moment from 'moment';
import { AppService } from '../services/app.service';

@Component({
  selector: 'app-information-popup',
  templateUrl: './information-popup.component.html',
  styleUrls: ['./information-popup.component.css']
})
export class InformationPopupComponent implements OnInit, OnDestroy {
  public chartEvent: any = {}
  observationEvent: any = {};
  observations: Array<Observation> = null;
  obsTypes: Array<Observationtype> = [];
  obsHistory: any = [];
  obsEventHistory: any = [];
  obsNameHeader: string = "";
  subscriptions: Subscription = new Subscription();
  currentObservation: any = {};
  isCurrentEncounter: boolean = false;


  @ViewChild('openInfo') openInfo: ElementRef;
  @ViewChild('closeInfo') closeInfo: ElementRef;

  constructor(private subjects: SubjectsService, private apiRequest: ApirequestService, private appService: AppService) {
    //this.getMetaData();

    this.subscriptions.add(this.subjects.apiServiceReferenceChange.subscribe(() => {
      this.getMetaData();
    }));

    this.subscriptions.add(this.subjects.openPopover.subscribe
      ((event: any) => {
        this.appService.logToConsole(event);
        this.chartEvent = event;
        this.obsHistory = [];
        this.observations = [];
        this.observationEvent = {};
        this.currentObservation = {};
        this.obsNameHeader = obsNameHeadersFromChart[obsNamesFromChart[event.name]];
        this.openModal();

        this.getObservationEvent(event.observationevent_id);
        this.isCurrentEncounter = this.appService.isCurrentEncouner;;

      }));

  }
  ngOnDestroy() {
    this.appService.logToConsole("destroying information popup component instance");

    this.subscriptions.unsubscribe();
  }
  getMetaData() {
    this.appService.logToConsole("in metadata: information popup");
    //get observation types
    this.apiRequest.getRequest(this.appService.baseURI + "/GetList?synapsenamespace=meta&synapseentityname=observationtype").subscribe(
      (response) => {
        let responseArray = JSON.parse(response);
        for (let r of responseArray) {
          this.obsTypes.push(<Observationtype>r);
        }
      });
  }

  closeModal() {
    this.closeInfo.nativeElement.click();

  }
  openModal() {
    this.openInfo.nativeElement.click();
  }

  getObservationEvent(observationevent_id: string) {

    this.apiRequest.getRequest(`${this.appService.baseURI}/GetListByAttribute?synapsenamespace=core&synapseentityname=observationevent&synapseattributename=observationevent_id&returnsystemattributes=1&attributevalue=${observationevent_id}`)
      .subscribe
      ((observationevent) => {

        let responseEvent = JSON.parse(observationevent);
        responseEvent[0]._createddate = new Date(this.formatUTCDate(responseEvent[0]._createdtimestamp));
        this.observationEvent = <Observationevent>responseEvent[0];

        this.getObservationsForEvent(observationevent_id);

      });
  }

  getObservationsForEvent(observationevent_id: string) {
    this.apiRequest.getRequest(`${this.appService.baseURI}/GetListByAttribute?synapsenamespace=core&synapseentityname=observation&synapseattributename=observationevent_id&returnsystemattributes=1&attributevalue=${observationevent_id}`)
      .subscribe((response) => {
        this.observations = [];
        let responseArray = JSON.parse(response);
        for (let r of responseArray) {
          r._createddate = new Date(this.formatUTCDate(r._createdtimestamp));

          if (this.chartEvent.name == "device")
            r.value = deviceDisplayName[r.value];

          this.observations.push(<Observation>r);
        }

        this.getHistory();
      });
  }

  onClick(event: string) {

    if (event == "edit") {
      this.closeModal()
      setTimeout(() => {
        this.subjects.openObsForm.next("Amend Observations");
        this.subjects.amendObs.next(this.chartEvent.observationevent_id);
      }, 500);


    }
    else if (event == "history") {
      this.getHistory();
    }
    else if (event == "invalidate") {

      //this.observationEvent._recordstatus = 4;
      //this.appService.logToConsole(this.observationEvent);
      //this.apiRequest.postRequest(this.appService.baseURI + "/PostObject?synapsenamespace=core&synapseentityname=observationevent", JSON.stringify(this.observationEvent)).
      //  then((resp) => {

      //    this.appService.logToConsole("invalidated");
      //    this.closeModal();
      //    this.subjects.showMessage.next({ result: "complete", message: "Observations Invalidated" });
      //    this.subjects.drawGraph.next();

      //  }).catch((err) => {
      //    this.appService.logToConsole("error invalidating observations event");
      //    this.appService.logToConsole(err);
      //    this.subjects.showMessage.next({ result: false, message: "There was an error invalidating the observations: " + err });
      //  });

    }
  }
  getHistory() {
    //get obs type id

    let ot = this.obsTypes.filter(typ => typ.code == obsNamesFromChart[this.chartEvent.name])
    if (ot && ot.length > 0) {
      let obsTypeId = ot[0].observationtype_id;

      let observation_id = "";
      if (this.observations) {
        try {
          observation_id = this.observations.filter(x => x.observationtype_id == obsTypeId)[0].observation_id;
        }
        catch
        {
        }

        if (observation_id != "") {

          //get observation event history to correlate reason of amendments

          this.apiRequest.getRequest(`${this.appService.baseURI}/GetObjectHistory?synapsenamespace=core&synapseentityname=observationevent&id=${this.observationEvent.observationevent_id}`)
            .subscribe((responseevent) => {
              let observationeventhistory = JSON.parse(responseevent);


              this.currentObservation = this.observations.filter(x => x.observation_id == observation_id)[0];
              //get history
              this.apiRequest.getRequest(`${this.appService.baseURI}/GetObjectHistory?synapsenamespace=core&synapseentityname=observation&id=${observation_id}`)
                .subscribe((response) => {
                  this.obsHistory = [];
                  let responseArray = JSON.parse(response);

                  //sort the array by latest amend last
                  responseArray.sort(function compare(a, b) {
                    var dateA = new Date(a._createddate);
                    var dateB = new Date(b._createddate);
                    return dateA.getTime() - dateB.getTime();
                  });

                  let i = 0;
                  let prevValue: string = "";
                  for (let r of responseArray) {
                    if ((<Observation>r).hasbeenammended || (i == 0 && responseArray.filter(x => x.hasbeenammended == true).length > 0)) {
                      if (r.value != prevValue) {
                        prevValue = r.value;
                        if (i == 0 && (<Observation>r).hasbeenammended == false) {
                          r._createddate = r.timerecorded;
                          r.action = "Added by ";
                        } else {
                          r._createddate = new Date(this.formatUTCDate(r._createdtimestamp));
                          r.action = "Amended by "
                        }
                        i++;

                        if (this.chartEvent.name == "device")
                          r.value = deviceDisplayName[r.value];

                        if (this.chartEvent.name == "consciousness")
                          r.value = consciousLevelDisplayName[r.value];

                        //get amend reason
                        if (r.eventcorrelationid) {
                          let event = (<Observationevent[]>observationeventhistory).filter(x => x.eventcorrelationid == r.eventcorrelationid)
                          if (event && event.length != 0)
                            r.reasonforamend = event[0].reasonforamend;
                        }
                        this.currentObservation = <Observation>r;
                        this.obsHistory.push(<Observation>r);
                      }
                    }
                  }

                  this.obsHistory.reverse();

                });


            });



        }

      }
    }
    else {
      if (this.chartEvent.name == "escalationofcare" || this.chartEvent.name == "monitoring") {

        if (this.observationEvent) {
          //get history
          this.apiRequest.getRequest(`${this.appService.baseURI}/GetObjectHistory?synapsenamespace=core&synapseentityname=observationevent&id=${this.chartEvent.observationevent_id}`)
            .subscribe((responseEvent) => {
              this.obsHistory = [];
              let responseArray = JSON.parse(responseEvent);
              //this.appService.logToConsole(responseArray);
              responseArray.sort(function compare(a, b) {
                var dateA = new Date(a._createddate);
                var dateB = new Date(b._createddate);
                return dateA.getTime() - dateB.getTime();
              });

              let prevValue: any = "";
              let i = 0;

              for (let r of responseArray) {
                let currValue: any = "";
                if (this.chartEvent.name == "escalationofcare")
                  currValue = (r.escalationofcare == null ? "null" : r.escalationofcare);
                else
                  if (this.chartEvent.name == "monitoring")
                    currValue = (r.observationfrequency == null ? "" : r.observationfrequency)

                if (currValue != prevValue) {
                  prevValue = currValue;
                  if (i == 0) {
                    r._createddate = r.datefinished;
                    r.action = "Added by ";
                    r.value = currValue.toString();

                  } else {
                    r._createddate = new Date(this.formatUTCDate(r._createdtimestamp));
                    r.value = currValue.toString();
                    r.action = "Amended by "
                  }
                  i++;
                  this.currentObservation = r;

                  this.obsHistory.push(r);
                }


              }

              this.obsHistory.reverse();

            });

        }
      }
    }

  }


  formatUTCDate(d: string): string {

    var date = new Date(moment(d, moment.ISO_8601).toString());
    var hours = date.getHours();
    var minutes = date.getMinutes();

    let year = date.getFullYear();
    let month = (date.getMonth() + 1);
    let dt = date.getDate();
    let hrs = date.getHours();
    let mins = date.getMinutes();
    let secs = date.getSeconds();


    let returndate = (year + "-" + (month < 10 ? "0" + month : month) + "-" + (dt < 10 ? "0" + dt : dt) + "T" + (hrs < 10 ? "0" + hrs : hrs) + ":" + (mins < 10 ? "0" + mins : mins) + ":" + (secs < 10 ? "0" + secs : secs) + ".000Z");
    return returndate;
  }



  ngOnInit() {
  }

}
