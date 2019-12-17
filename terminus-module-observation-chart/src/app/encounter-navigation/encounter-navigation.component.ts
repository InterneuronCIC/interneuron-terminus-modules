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
import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { ApirequestService } from '../services/apirequest.service';
import { filters, filter, filterParams, filterparam, selectstatement, orderbystatement } from '../models/Filter.model';
import { SubjectsService } from '../services/subjects.service';
import { AppService } from '../services/app.service';
import { Encounter } from '../models/encounter.model';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-encounter-navigation',
  templateUrl: './encounter-navigation.component.html',
  styleUrls: ['./encounter-navigation.component.css']
})
export class EncounterNavigationComponent implements OnInit, OnDestroy {

  encounters: Array<Encounter> = [];
  selectedEncounterText: string = "Visits";
  @Output() loadComplete: EventEmitter<string> = new EventEmitter();
  @Output() clicked: EventEmitter<string> = new EventEmitter();
  @Output() encountersLoaded: EventEmitter<boolean> = new EventEmitter();

  subscriptions: Subscription = new Subscription();


  constructor(private callapi: ApirequestService, private subjects: SubjectsService, private appservice: AppService, private datepipe: DatePipe) {
    this.subscriptions.add(
      this.subjects.personIdChange.subscribe(() => {
        this.appservice.logToConsole('getting encounters');
        this.fillEncounters();
      }));
  }
  ngOnDestroy() {
    this.appservice.logToConsole("destroying encounter component instance");

    this.subscriptions.unsubscribe();
  }
  fillEncounters() {
    this.subscriptions.add(this.callapi.postRequest(this.appservice.baseURI + "/GetBaseViewListByPost/bv_core_inpatientappointments", this.createEncounterFilter()).subscribe
      ((response) => {
        this.appservice.logToConsole("got encounters");
        this.appservice.logToConsole(response);
        //response.sort(function (a, b) {
        //  return a.admitdatetime - b.admitdatetime;
        //});
        this.encounters = [];
        this.appservice.encouter = null;
        this.selectedEncounterText = "";
        for (var i = 0; i < response.length; i++) {
          if (i == 0) {
            if (response[i].dischargedatetime == "" || response[i].dischargedatetime == null)
              response[i].displayText = "Current Visit (" + this.datepipe.transform(response[i].admitdatetime, 'dd-MMM-yyyy', 'en-GB') + ")";
            else
              response[i].displayText = this.datepipe.transform(response[i].admitdatetime, 'dd-MMM-yyyy', 'en-GB')
          }
          else
            response[i].displayText = this.datepipe.transform(response[i].admitdatetime, 'dd-MMM-yyyy', 'en-GB')

          this.encounters.push(<Encounter>response[i])
        }
        if (response != null && response.length > 0) {
          this.selectEncounter(this.encounters[0]);
          this.encountersLoaded.emit(true);
        }
        else
          this.encountersLoaded.emit(false);
      }));
  }

  createEncounterFilter() {

    //let condition = "admitdatetime >= @startdate::timestamp and person_id=@person_id";
    let condition = "person_id=@person_id";
    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();
    // pm.filterparams.push(new filterparam("startdate", "2010-05-16T00:00:00.000Z"));
    pm.filterparams.push(new filterparam("person_id", this.appservice.personId));

    let select = new selectstatement("SELECT person_id, encounter_id,admitdatetime,dischargedatetime");

    let orderby = new orderbystatement("ORDER BY admitdatetime desc");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    this.appservice.logToConsole(JSON.stringify(body));
    return JSON.stringify(body);
  }

  ngOnInit() {
    this.loadComplete.emit("Encounter component Ready");
  }

  public selectEncounter(encounter: Encounter) {
    this.appservice.logToConsole("encouter selected");
    this.appservice.logToConsole(encounter);
    this.selectedEncounterText = encounter.displayText;
    this.appservice.encouter = encounter;
    if ((encounter.displayText.indexOf("Current Visit") != -1))
      this.appservice.isCurrentEncouner = true;
    else
      this.appservice.isCurrentEncouner = false;
    this.subjects.encounterChange.next(encounter);
    this.subjects.drawGraph.next();
  }
  encounterClicked() {
    this.clicked.emit("Encounter component clicked");
  }
}
