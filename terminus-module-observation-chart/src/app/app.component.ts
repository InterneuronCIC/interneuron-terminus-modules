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

import { Component, ViewChild, ElementRef, OnDestroy, Input, HostListener, Output, EventEmitter, AfterViewInit } from '@angular/core';
import { SubjectsService } from './services/subjects.service';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { AppService } from './services/app.service';
import { Subscription, Subject } from 'rxjs';
import { ApirequestService } from './services/apirequest.service';
import { isArray } from 'util';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {

  hasEncounters: boolean = false;
  showNoEncounterMsg: boolean = false;
  encountersListLoaded(value: boolean) {
    this.hasEncounters = value;
    this.showNoEncounterMsg = !value;
  }
  //ngAfterViewInit(): void {
  //  this.isActive = true;

  //  this.appService.logToConsole("Service reference is being published");
  //  this.subjects.apiServiceReferenceChange.next();
  //  this.appService.logToConsole("personid is being published");
  //  this.subjects.personIdChange.next();
  //}
  //@Input() public personid: string = "";
  //@Input() public apiservice: any;

  //@HostListener("window:scroll", [])
  //onWindowScroll() {
  //  if (!document.getElementById("xAxisHeader").classList.contains("xAxisHeader") && Math.abs(this.tempY - scrollY) > 5)
  //    document.getElementById("xAxisHeader").className = "xAxisHeader";
  //  this.appService.logToConsole("scrolly: " + scrollY);
  //};

  title = 'terminus-module-observation-chart';
  modalRef: BsModalRef;
  alerts: any[] = [];
  observationsFormHeader: string = "Add Observations";
  @ViewChild('closObsForm') closeObsFormButton: ElementRef;
  @ViewChild('openObsForm') openObsFormButton: ElementRef;

  subscriptions: Subscription = new Subscription();
  tempY = 0;
  obsLoaded: boolean = false;
  isCurrentEncounter: boolean = false;

  isActive: boolean = true;
  @Input() set personid(value: string) {
    this.appService.personId = value;
  }
  @Input() set apiservice(value: any) {

    if (!this.appService.appConfig) {
      this.initConfig(value);
    }
    else {
      this.appService.logToConsole("Service reference is being set");
      this.appService.apiService = value;
      this.appService.logToConsole("Service reference is being published");
      this.subjects.apiServiceReferenceChange.next();
      this.appService.logToConsole("personid is being published");
      this.subjects.personIdChange.next();
    }
  }
  @Input() set unload(value: Subject<any>) {
    this.subjects.unload = value;
  }
  @Output() frameworkAction = new EventEmitter<string>();

  constructor(private subjects: SubjectsService, private modalService: BsModalService, private appService: AppService, private apiRequest: ApirequestService) {

    this.subscriptions.add(this.subjects.openObsForm.subscribe((formHeader: string) => {
      this.observationsFormHeader = formHeader;
      this.openObsFormButton.nativeElement.click();
    }));

    this.subscriptions.add(this.subjects.showMessage.subscribe((status: any) => {
      this.showMessage(status);
    }));
    this.subscriptions.add(this.subjects.closeObsForm.subscribe((status: any) => {
      this.closeOBsModal();
      this.showMessage(status);
    }));

    this.subscriptions.add(this.subjects.encounterChange.subscribe(() => {
      this.isCurrentEncounter = this.appService.isCurrentEncouner;
    }));
    //this.subscriptions.add(this.subjects.openPopover.subscribe((status: any) => {
    //  this.appService.logToConsole("popover");
    //  setTimeout(() => { this.removeXaxisCss() }, 100);
    //}));

    //this.subscriptions.add(this.subjects.openDeletePopover.subscribe((status: any) => {
    //  this.appService.logToConsole("delete popover");
    //  setTimeout(() => { this.removeXaxisCss() }, 100);
    //}));

    //this.subscriptions.add(this.subjects.openObsForm.subscribe((status: any) => {
    //  this.appService.logToConsole("delete popover");
    //  setTimeout(() => { this.removeXaxisCss() }, 100);
    //}));
  }

  initConfig(value: any) {

    this.appService.apiService = value;

    if (this.appService.apiService) {
      let decodedToken = this.appService.decodeAccessToken(this.appService.apiService.authService.user.access_token);
      if (decodedToken != null)
        this.appService.loggedInUserName = decodedToken.name ? (isArray(decodedToken.name) ? decodedToken.name[0] : decodedToken.name) : decodedToken.IPUId;
    }
    this.subscriptions.add(this.apiRequest.getRequest("./assets/config/ObsChartConfig.json").subscribe(
      (response) => {
        this.appService.appConfig = response;
        this.appService.baseURI = this.appService.appConfig.uris.baseuri;
        this.appService.autonomicsBaseURI = this.appService.appConfig.uris.autonomicsbaseuri;
        this.appService.enableLogging = this.appService.appConfig.enablelogging;

        //emit events after getting initial config. //this happens on first load only. 
        this.appService.logToConsole("Service reference is being published from init config");
        this.subjects.apiServiceReferenceChange.next();
        this.appService.logToConsole("personid is being published from init config");
        this.subjects.personIdChange.next();
      }));
  }

  encounterLoadComplete() {
    // commment out to push to framework - 3lines
    this.appService.personId = "17775da9-8e71-4a3f-9042-4cdcbf97efec";//"027c3400-24cd-45c1-9e3d-0f4475336394";//"0422d1d0-a9d2-426a-b0b2-d21441e2f045";
    this.initConfig(null);
  }

  ngOnDestroy() {
    this.appService.logToConsole("app component being unloaded");
    this.appService.encouter = null;
    this.appService.personId = null;
    this.appService.personscale = null;
    this.appService.isCurrentEncouner = null;

    this.subscriptions.unsubscribe();
    this.subjects.unload.next("app-element");
  }

  showMessage(status: any) {
    if (status.result == "complete") {

      this.alerts = [];
      this.alerts.push({
        type: 'success',
        msg: `${status.message}`,
        timeout: status.timeout ? status.timeout : 0
      });
    }
    else if (status.result == "failed") {
      this.alerts = [];
      this.alerts.push({
        type: 'danger',
        msg: `${status.message}`,
        timeout: status.timeout ? status.timeout : 0
      });
    }
    else if (status.result == "inprogress") {
      this.alerts = [];
      this.alerts.push({
        type: 'info',
        msg: `${status.message}`,
        timeout: status.timeout ? status.timeout : 0
      });
    }

  }

  public openObsModal() {
    this.observationsFormHeader = "Add Observations";
    this.subjects.newObs.next();
    //this.removeXaxisCss();
    this.appService.logToConsole(this.appService.personId);

  }

  public removeXaxisCss() {
    this.tempY = scrollY;
    //document.getElementById("xAxisHeader").className = "";
  }


  public closeOBsModal() {
    this.closeObsFormButton.nativeElement.click();
  }
  obsLoadComplete() {
    this.obsLoaded = true;
  }
  obsUpdateFrameworkEvents(event) {
    this.appService.logToConsole(event);
    this.frameworkAction.emit(event);
  }



  //ngOnChanges(changes: SimpleChanges) {

  //  this.appService.logToConsole("personid changed: " + changes.personid.currentValue);
  //  if (!this.appService.apiService) {
  //    this.appService.logToConsole("first service reference is being published");
  //    this.appService.apiService = this.apiservice;
  //    this.subjects.apiServiceReferenceChange.next();
  //  }

  //  this.appService.apiService = this.apiservice;

  //  this.appService.personId = this.personid;
  //  this.subjects.personIdChange.next();
  //}
}
