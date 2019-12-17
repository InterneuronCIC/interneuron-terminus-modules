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
import { ApirequestService } from '../services/apirequest.service';
import { SubjectsService } from '../services/subjects.service';
import { AppService } from '../services/app.service';
// import AppConfig from 'src/assets/config/observationConfig.json';
import { Observationscaletype } from "src/app/models/observations.model";
import { PersonObservationScale } from "src/app/models/observations.model";
import { v4 as uuid } from 'uuid';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-person-scaletype',
  templateUrl: './person-scaletype.component.html',
  styleUrls: ['./person-scaletype.component.css'
  ]
})
export class PersonScaletypeComponent implements OnInit, OnDestroy {
  observationScaleType: Observationscaletype[];
  personID: string;
  pin: string = "admin123";
  disabledsavebutton: boolean = true;
  personobservationscale: PersonObservationScale;
  selectedscaletype: string;
  subscriptions: Subscription = new Subscription();
  displayScaleType: string = "Scale Type";

  @ViewChild('txtPin')
  private txtPin: ElementRef;
  constructor(private callapi: ApirequestService, private subjects: SubjectsService, private appservice: AppService) {
    this.subscriptions.add(
      this.subjects.personIdChange.subscribe(() => {
        this.personID = this.appservice.personId;

        this.getobservationScaleType(this.personID);

      }));
  }
  ngOnDestroy() {
    this.appservice.logToConsole("destroying scale form component instance");
    this.subscriptions.unsubscribe();
  }
  ngOnInit() {
  }
  onSearchChange(searchValue: string) {
    if (searchValue === this.pin) {
      this.disabledsavebutton = false;
    }
    else {
      this.disabledsavebutton = true;
    }
  }
  getobservationScalebypersonid(personid: string) {
    this.callapi.getRequest(this.appservice.baseURI + "/GetListByAttribute?synapsenamespace=core&synapseentityname=personobservationscale&synapseattributename=person_id&attributevalue=" + personid)
      .subscribe(
        (personobservationscale) => {

          let personobservationscalelist = <PersonObservationScale[]>JSON.parse(personobservationscale);
          if (personobservationscalelist.length > 0) {
            this.personobservationscale = personobservationscalelist[0];

            for (let scaletype of this.observationScaleType) {
              if (scaletype.observationscaletype_id == this.personobservationscale.observationscaletype_id) {
                //document.getElementById('selectedscaletype').innerHTML = scaletype.scaletypename;
                this.displayScaleType = scaletype.scaletypename;
                this.selectedscaletype = scaletype.observationscaletype_id;
              }

            }


          }
        }

      )
  }
  updateScaletype() {
    if (this.personobservationscale && this.personobservationscale.observationscaletype_id) {
      this.personobservationscale.observationscaletype_id = this.selectedscaletype;
    }
    else {
      this.personobservationscale = new PersonObservationScale();
      this.personobservationscale.personobservationscale_id = uuid();
      this.personobservationscale.person_id = this.personID;
      this.personobservationscale.observationscaletype_id = this.selectedscaletype;
    }
    let teturn = this.callapi.postRequest(this.appservice.baseURI + "/PostObject?synapsenamespace=core&synapseentityname=personobservationscale", JSON.stringify(this.personobservationscale))
      .subscribe(() => {
        this.txtPin.nativeElement.value = "";
        this.appservice.personscale = this.personobservationscale;
        this.subjects.showMessage.next({ result: "complete", message: "Scale updated.", timeout: 10000 });

      });

  }
  public onChange(event): void {  // event will give you full breif of action
    //document.getElementById('selectedscaletype').innerHTML = event.scaletypename;
    this.displayScaleType = event.scaletypename;
    this.selectedscaletype = event.observationscaletype_id;

  }
  getobservationScaleType(personID: string) {
    this.subscriptions.add(this.callapi.getRequest(this.appservice.baseURI + "/GetList?synapsenamespace=meta&synapseentityname=observationscaletype")
      .subscribe(
        (observationScaleType) => {
          this.observationScaleType = <Observationscaletype[]>JSON.parse(observationScaleType);

          // set scale1 default
          this.displayScaleType = this.observationScaleType[0].scaletypename;
          this.selectedscaletype = this.observationScaleType[0].observationscaletype_id;

          this.getobservationScalebypersonid(personID);
        }
      ));
  }
}
