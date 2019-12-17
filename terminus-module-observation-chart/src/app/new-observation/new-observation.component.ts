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
import { Component, OnInit, OnDestroy, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, Validators, FormGroup, AbstractControl, FormControl } from '@angular/forms';
import { ApirequestService } from '../services/apirequest.service';
import { Observation, Observationtype, Observationevent, obsNames, Oxygendevices, Observationscaletype, Observationtypemeasurement, PersonObservationScale } from '../models/observations.model'
import { v4 as uuid } from 'uuid';
import { SubjectsService } from '../services/subjects.service';
import { AppService } from '../services/app.service';
import { Subscription } from 'rxjs';
import * as moment from 'moment';

@Component({
  selector: 'app-new-observation',
  templateUrl: './new-observation.component.html',
  styleUrls: ['./new-observation.component.css']
})

export class NewObservationComponent implements OnInit, OnDestroy {

  obsForm = this.fb.group({
    reasonForAmend: [''],
    reasonForIncomplete: [''],
    patientScale: ['', Validators.required],
    captureIncompleteObs: [''],
    genObs: this.fb.group({

      oxyGrp: this.fb.group({
        oxygenDevice: [''],
        inspiredOxygenPercentage: [''],
        inspiredOxygenLitrePerMin: ['']
      }),

      positionBP: [''],
      painScaleMovement: ['', [Validators.min(0), Validators.max(10)]],
      painScaleRest: ['', [Validators.min(0), Validators.max(10)]],
      supplementalOxygen: [''],

      newsMandatory: this.fb.group({
        temperature: [''],
        respirationRate: ['', Validators.required],
        oxygenSaturation: [''],
        pulseRate: [''],
        systolicBP: [''],
        diastolicBP: [''],
        consciousLevel: ['']

      })
    }),
    otherObs: this.fb.group({
      glucose: ['', [Validators.min(0), Validators.max(50)]],
      bowelsOpen: [''],
      height: ['', [Validators.min(1), Validators.max(400)]],
      weight: ['', [Validators.min(0.1), Validators.max(1000)]],
      isPatientSick: [''],
      couldBeInfection: [''],
      concernsAboutPatient: ['']

    }),
    monitoringFrequency: [''],
    escalationofCare: [''],
    observationDate: [new Date(), Validators.required],
    observationTime: [new Date(), [Validators.required, this.maxTimeValidator(this)]]
  });
  obsTypes: Array<Observationtype> = [];
  oxygenDevices: Array<Oxygendevices> = [];
  obsScales: Array<Observationscaletype> = [];
  obsMeasurement: Array<Observationtypemeasurement> = [];
  oldObservations: Array<Observation> = null;
  oldObservationEvent: Observationevent = null;
  disableSubmit: boolean = false;
  //Issue	1	Nursing App	The time of an observation can be set in the future	Expected behavior: User should not be able to set this to a future date - time
  minDate: Date = new Date(0);
  maxDate: Date = new Date();
  subscriptions: Subscription = new Subscription();

  @Output() loadComplete: EventEmitter<string> = new EventEmitter();
  @Output() updateFrameworkEvents: EventEmitter<string> = new EventEmitter();


  @ViewChild('firstElement')
  private firstElement: ElementRef;

  constructor(private fb: FormBuilder, private apiRequest: ApirequestService, private subjects: SubjectsService, private appService: AppService) {

    this.onChanges();
    this.setNewsRequiredValidator(false);
    this.subscriptions.add(this.subjects.apiServiceReferenceChange.subscribe(() => {
      this.getMetaData();
    }));
    //this.getMetaData();

    this.obsForm.get('patientScale').disable();
    this.subscriptions.add(this.obsForm.get('observationDate').statusChanges.subscribe(
      (event) => {
        if (this.obsForm.get('observationDate').dirty) this.obsForm.get('observationTime').updateValueAndValidity();
      }
    ));
  }


  ngOnDestroy() {
    this.appService.logToConsole("destroying obs form component instance");
    this.subscriptions.unsubscribe();
  }

  resetForm() {

    //reset pervious informatoin messages

    this.subjects.showMessage.next({ result: "complete", message: "", timeout: 10 })


    //this.appService.logToConsole(moment("2019-07-17T09:04:30.666123", moment.ISO_8601).toString());
    //this.appService.logToConsole(new Date(moment("2019-07-17T09:04:30.666123", moment.ISO_8601).toString()))
    this.oldObservations = null;
    this.oldObservationEvent = null;
    this.disableSubmit = false;
    this.obsForm.reset();
    setTimeout(() => {
      this.firstElement.nativeElement.focus();
    }, 200);

    //set min and max dates
    //min is always admin date time, max is current date for current visit and discharge datetime for previous visits
    //Issue	36	Nursing App	Observations can be added and amended for a previous episode	Expected behavior: should NOT be able to enter or modify an observation for a previous episode	limiting it to the time window of the episode.	P1	See issue #1 - the Observation capture form should only allow capture of observations for times between the encounters AdmitDateTime and DIschargeDateTime.

    this.minDate = this.appService.encouter.admitdatetime ? new Date(moment(this.appService.encouter.admitdatetime, moment.ISO_8601).toString()) : new Date(0);
    this.maxDate = this.appService.encouter.dischargedatetime ? new Date(moment(this.appService.encouter.dischargedatetime, moment.ISO_8601).toString()) : new Date();


    //set defaults
    if (this.appService.personscale) {
      this.appService.logToConsole("in reset form found a scale for this person");
      this.appService.logToConsole(this.appService.personscale);
      this.appService.logToConsole(this.appService.personscale.observationscaletype_id);
      this.obsForm.get('patientScale').setValue(this.appService.personscale.observationscaletype_id);
    }
    else {
      this.appService.logToConsole("in reset form found no scale");
      this.appService.logToConsole(this.appService.personscale);
      this.appService.logToConsole(this.obsScales.filter(x => x.scaletypename == "NEWS2-Scale1")[0].observationscaletype_id);
      this.obsForm.get('patientScale').setValue(this.obsScales.filter(x => x.scaletypename == "NEWS2-Scale1")[0].observationscaletype_id);
    }
    this.obsForm.get('patientScale').updateValueAndValidity();

    this.obsForm.get('observationDate').enable();
    this.obsForm.get('observationTime').enable();

    //if discharge datetime is null (current encounter) set observationdate to current date else leave blank.
    if (this.appService.encouter.dischargedatetime != null) {
      this.obsForm.get('observationDate').setValue("");
      this.obsForm.get('observationTime').setValue("");
    }
    else {
      this.obsForm.get('observationDate').setValue(new Date());
      this.obsForm.get('observationTime').setValue(new Date());

    }

    this.obsForm.get('observationDate').updateValueAndValidity();
    this.obsForm.get('observationTime').updateValueAndValidity();


    this.obsForm.get('monitoringFrequency').setValue("4");
    this.obsForm.get('monitoringFrequency').updateValueAndValidity();

    //clear validators for conditional validaitons. 
    this.obsForm.get('reasonForAmend').clearValidators();
    this.obsForm.get('reasonForAmend').updateValueAndValidity();

    //not required after changing control to dropdown
    //this.obsForm.get('genObs.supplementalOxygen').setValue(false);
    //this.obsForm.get('genObs.supplementalOxygen').updateValueAndValidity();

    for (const field in (<FormGroup>this.obsForm.get('genObs.oxyGrp')).controls) {
      const control = this.obsForm.get('genObs.oxyGrp.' + field);
      if (control) {
        control.clearValidators();
        control.updateValueAndValidity();
      }
    }

  }

  getObsForEventAndPrepopulateForm(observationevent_id: string) {
    this.appService.logToConsole("amed obs for:" + observationevent_id)

    this.subscriptions.add(this.apiRequest.getRequest(`${this.appService.baseURI}/GetListByAttribute?synapsenamespace=core&synapseentityname=observation&synapseattributename=observationevent_id&attributevalue=${observationevent_id}`)
      .subscribe((response) => {
        this.subscriptions.add(this.apiRequest.getRequest(`${this.appService.baseURI}/GetListByAttribute?synapsenamespace=core&synapseentityname=observationevent&synapseattributename=observationevent_id&attributevalue=${observationevent_id}`)
          .subscribe
          ((response_event) => {

            this.oldObservationEvent = <Observationevent>response_event;
            this.oldObservations = [];

            let responseArray = JSON.parse(response);
            let responseEvent = JSON.parse(response_event);
            for (let r of responseArray) {
              this.oldObservations.push(<Observation>r);
            }

            for (const field in (<FormGroup>this.obsForm.get('genObs.newsMandatory')).controls) {
              const control = this.obsForm.get('genObs.newsMandatory.' + field);
              if (control) {
                //get old value
                this.prePopulateField(field, control);
              }
            }

            for (const field in (<FormGroup>this.obsForm.get('genObs.oxyGrp')).controls) {
              const control = this.obsForm.get('genObs.oxyGrp.' + field);
              if (control) {
                //get old value
                this.prePopulateField(field, control);
              }
            }

            for (const field in (<FormGroup>this.obsForm.get('genObs')).controls) {
              const control = this.obsForm.get('genObs.' + field);
              if (control) {
                //get old value
                this.prePopulateField(field, control);
              }
            }

            for (const field in (<FormGroup>this.obsForm.get('otherObs')).controls) {
              const control = this.obsForm.get('otherObs.' + field);
              if (control) {
                //get old value
                this.prePopulateField(field, control);
              }
            }

            for (const field in (<FormGroup>this.obsForm.get('otherObs')).controls) {
              const control = this.obsForm.get('otherObs.' + field);
              if (control) {
                //get old value
                this.prePopulateField(field, control);
              }
            }

            var dt = new Date(moment((<Observationevent>responseEvent[0]).datefinished, moment.ISO_8601).toString());
            dt.setMilliseconds(moment((<Observationevent>responseEvent[0]).datefinished, moment.ISO_8601).milliseconds());
            this.obsForm.get('observationDate').setValue(dt);
            this.obsForm.get('observationDate').updateValueAndValidity();

            this.obsForm.get('observationTime').setValue(dt);
            this.obsForm.get('observationTime').updateValueAndValidity();

            this.obsForm.get('monitoringFrequency').setValue((<Observationevent>responseEvent[0]).observationfrequency.toString());
            this.obsForm.get('monitoringFrequency').updateValueAndValidity();

            this.obsForm.get('escalationofCare').setValue((<Observationevent>responseEvent[0]).escalationofcare);
            this.obsForm.get('escalationofCare').updateValueAndValidity();

            this.obsForm.get('observationDate').disable();
            this.obsForm.get('observationTime').disable();

            this.obsForm.get('patientScale').setValue((<Observationevent>responseEvent[0]).observationscaletype_id);
            this.obsForm.get('patientScale').updateValueAndValidity();

          }));

      }));
  }

  prePopulateField(field: string, control: AbstractControl) {

    if (Object.keys(obsNames).includes(field)) {

      //get observation type id for this field
      let observationtype_id = this.obsTypes.filter(x => x.code == obsNames[field])[0].observationtype_id;
      this.appService.logToConsole(observationtype_id);
      //get obs value from response based on obs type id

      let obs = this.oldObservations.filter(x => x.observationtype_id == observationtype_id)
      this.appService.logToConsole(obs);
      if (obs && obs.length > 0) {
        this.appService.logToConsole(field);
        this.appService.logToConsole(obs[0].value);
        let obsValue = obs[0].value;
        //not this check is not required after changign controls to dropdownlist from checkbox
        //if (field == "supplementalOxygen") //|| field == "bowelsOpen")
        //  control.setValue(obsValue === "true");
        //else
        control.setValue(obsValue);

        control.updateValueAndValidity();
      }
    }
  }

  getDateTimefromForm(): string {

    var time = new Date(this.obsForm.getRawValue()["observationTime"]);
    var hours = time.getHours();
    var s = time.getSeconds();
    var m = time.getMilliseconds()
    var minutes = time.getMinutes();
    var date = new Date(this.obsForm.getRawValue()["observationDate"]);
    date.setHours(hours);
    date.setMinutes(minutes);
    //date.setSeconds(s);
    //date.setMilliseconds(m);
    //this.appService.logToConsole(date);
    let year = date.getFullYear();
    let month = (date.getMonth() + 1);
    let dt = date.getDate();
    let hrs = date.getHours();
    let mins = date.getMinutes();
    let secs = date.getSeconds();
    let msecs = date.getMilliseconds();
    let returndate = (year + "-" + (month < 10 ? "0" + month : month) + "-" + (dt < 10 ? "0" + dt : dt) + "T" + (hrs < 10 ? "0" + hrs : hrs) + ":" + (mins < 10 ? "0" + mins : mins) + ":" + (secs < 10 ? "0" + secs : secs) + "." + (msecs < 10 ? "00" + msecs : (msecs < 100 ? "0" + msecs : msecs)));
    //this.appService.logToConsole(returndate);
    return returndate;
  }

  getMetaData() {
    this.appService.logToConsole("in metadata: obs form")
    //get observation types
    this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetList?synapsenamespace=meta&synapseentityname=observationtype").subscribe(
      (response) => {
        let responseArray = JSON.parse(response);
        for (let r of responseArray) {
          this.obsTypes.push(<Observationtype>r);
        }
      }));

    //get oxygen devices
    this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetList?synapsenamespace=meta&synapseentityname=oxygendevices").subscribe(
      (response) => {
        let responseArray = JSON.parse(response);
        for (let r of responseArray) {
          this.oxygenDevices.push(<Oxygendevices>r);
        }
      }));



    //get obs Symbols
    this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetList?synapsenamespace=meta&synapseentityname=observationtypemeasurement").subscribe(
      (response) => {
        let responseArray = JSON.parse(response);
        for (let r of responseArray) {
          this.obsMeasurement.push(<Observationtypemeasurement>r);
        }
      }));

    //get obs Scale 
    this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetList?synapsenamespace=meta&synapseentityname=observationscaletype").subscribe(
      (response) => {
        let responseArray = JSON.parse(response);
        for (let r of responseArray) {
          this.obsScales.push(<Observationscaletype>r);
        }

        //get person scale type
        this.subscriptions.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=core&synapseentityname=personobservationscale&synapseattributename=person_id&attributevalue=" + this.appService.personId)
          .subscribe(
            (personobservationscale) => {
              let personobservationscalelist = <PersonObservationScale[]>JSON.parse(personobservationscale);
              if (personobservationscalelist.length > 0) {
                this.appService.personscale = personobservationscalelist[0];
                this.appService.logToConsole("updating app service person scale type");
                this.appService.logToConsole(this.appService.personscale);

              }
              this.loadComplete.emit("Observations form component ready");

            }
          ));
      }));
  }

  ngOnInit() {
    this.subscriptions.add(this.subjects.newObs.subscribe(() => {
      this.resetForm();
    }))

    this.subscriptions.add(this.subjects.amendObs.subscribe((observationevent_id: string) => {
      this.appService.logToConsole("amend subscription");
      this.resetForm();
      this.getObsForEventAndPrepopulateForm(observationevent_id);
      this.obsForm.get('reasonForAmend').setValidators([Validators.required, this.noWhitespaceValidator]);
      this.obsForm.get('reasonForAmend').updateValueAndValidity();
    }));
  }

  onChanges(): void {
    this.subscriptions.add(this.obsForm.get('genObs.supplementalOxygen').valueChanges.subscribe(checked => {
      if (checked != "true") {
        for (const field in (<FormGroup>this.obsForm.get('genObs.oxyGrp')).controls) {
          const control = this.obsForm.get('genObs.oxyGrp.' + field);
          if (control) {
            control.clearValidators();
            control.updateValueAndValidity();
          }
        }
      } else {
        this.setOxygenDeviceValidators();
      }
    }));

    this.subscriptions.add(this.obsForm.get('captureIncompleteObs').valueChanges.subscribe(checked => {

      this.setNewsRequiredValidator(checked);
    }));

    this.subscriptions.add(this.obsForm.get('genObs.newsMandatory.diastolicBP').valueChanges.subscribe(value => {

      this.setSystolicMinValue(value);
    }));

    this.subscriptions.add(this.obsForm.get('otherObs.isPatientSick').valueChanges.subscribe(value => {
      if (value == "true" && this.obsForm.get('captureIncompleteObs').value != true) {
        this.obsForm.get('otherObs.couldBeInfection').setValidators(this.isUnansweredValidator);
        this.obsForm.get('otherObs.couldBeInfection').updateValueAndValidity();
      }
      else {
        this.obsForm.get('otherObs.couldBeInfection').clearValidators();
        this.obsForm.get('otherObs.couldBeInfection').updateValueAndValidity();

      }

    }));


  }

  setSystolicMinValue(value: any) {
    let min = 50
    if (value > min)
      min = value;

    if (this.obsForm.get('captureIncompleteObs').value == true)
      this.obsForm.get('genObs.newsMandatory.systolicBP').setValidators([Validators.min(min), Validators.max(300)]);
    else
      this.obsForm.get('genObs.newsMandatory.systolicBP').setValidators([Validators.required, Validators.min(min), Validators.max(300)]);


    this.obsForm.get('genObs.newsMandatory.systolicBP').updateValueAndValidity();


  }
  setNewsRequiredValidator(checked: boolean) {
    if (checked)
      this.setNewsRangeValidators();
    else
      this.setNewsRangeValidatorsWithRequired();
  }

  setOxygenDeviceValidators() {
    if (this.obsForm.get('captureIncompleteObs').value == true) {
      this.obsForm.get('genObs.oxyGrp.inspiredOxygenPercentage').setValidators([Validators.min(0), Validators.max(100)]);
      this.obsForm.get('genObs.oxyGrp.inspiredOxygenLitrePerMin').setValidators([Validators.min(0), Validators.max(100)]);
    }
    else {

      //this.obsForm.get('genObs.oxyGrp.inspiredOxygenPercentage').setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
      //Issue	2	Nursing App	Observation: Flow rate O2 percentage or L/min are both required when adding an Oxygen delivery device.
      //L/min should be mandatory, percentage should not be mandatory.
      this.obsForm.get('genObs.oxyGrp.inspiredOxygenPercentage').setValidators([Validators.min(0), Validators.max(100)]);
      this.obsForm.get('genObs.oxyGrp.inspiredOxygenLitrePerMin').setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
      this.obsForm.get('genObs.oxyGrp.oxygenDevice').setValidators(Validators.required);

    }
    for (const field in (<FormGroup>this.obsForm.get('genObs.oxyGrp')).controls) {
      const control = this.obsForm.get('genObs.oxyGrp.' + field);
      if (control) {
        control.updateValueAndValidity();
      }
    }
  }

  setNewsRangeValidators() {
    this.obsForm.get('genObs.newsMandatory.temperature').setValidators([Validators.min(30), Validators.max(45)]);
    this.obsForm.get('genObs.newsMandatory.respirationRate').setValidators([Validators.min(0), Validators.max(60)]);
    this.obsForm.get('genObs.newsMandatory.oxygenSaturation').setValidators([Validators.min(50), Validators.max(100)]);
    this.obsForm.get('genObs.newsMandatory.pulseRate').setValidators([Validators.min(10), Validators.max(250)]);
    let diastolicValue = this.obsForm.get('genObs.newsMandatory.diastolicBP').value;
    this.obsForm.get('genObs.newsMandatory.diastolicBP').setValidators([Validators.min(10), Validators.max(150)]);;
    //this.obsForm.get('genObs.newsMandatory.systolicBP').setValidators([Validators.min(diastolicValue), Validators.max(500)]);

    if (this.obsForm.get('genObs.supplementalOxygen').value == "true") {
      this.obsForm.get('genObs.oxyGrp.inspiredOxygenPercentage').setValidators([Validators.min(0), Validators.max(100)]);
      this.obsForm.get('genObs.oxyGrp.inspiredOxygenLitrePerMin').setValidators([Validators.min(0), Validators.max(100)]);
      this.obsForm.get('genObs.oxyGrp.oxygenDevice').clearValidators();
    }

    //this.obsForm.get('monitoringFrequency').setValidators([Validators.required, Validators.min(0.1), Validators.max(12)]);
    this.obsForm.get('monitoringFrequency').clearValidators();
    this.obsForm.get('monitoringFrequency').updateValueAndValidity();

    this.obsForm.get('otherObs.isPatientSick').clearValidators();
    this.obsForm.get('otherObs.isPatientSick').updateValueAndValidity();

    this.obsForm.get('otherObs.concernsAboutPatient').clearValidators();
    this.obsForm.get('otherObs.concernsAboutPatient').updateValueAndValidity();

    this.obsForm.get('genObs.supplementalOxygen').clearValidators();
    this.obsForm.get('genObs.supplementalOxygen').updateValueAndValidity();

    this.obsForm.get('otherObs.couldBeInfection').clearValidators();
    this.obsForm.get('otherObs.couldBeInfection').updateValueAndValidity();

    this.obsForm.get('reasonForIncomplete').setValidators([Validators.required, this.noWhitespaceValidator]);
    this.obsForm.get('reasonForIncomplete').updateValueAndValidity();

    this.obsForm.get('genObs.newsMandatory.consciousLevel').clearValidators();

    for (const field in (<FormGroup>this.obsForm.get('genObs.newsMandatory')).controls) {
      const control = this.obsForm.get('genObs.newsMandatory.' + field);
      if (control) {
        control.updateValueAndValidity();
      }
    }

    for (const field in (<FormGroup>this.obsForm.get('genObs.oxyGrp')).controls) {
      const control = this.obsForm.get('genObs.oxyGrp.' + field);
      if (control) {
        control.updateValueAndValidity();
      }
    }

  }

  setNewsRangeValidatorsWithRequired() {
    this.obsForm.get('genObs.newsMandatory.temperature').setValidators([Validators.required, Validators.min(30), Validators.max(45)]);
    this.obsForm.get('genObs.newsMandatory.respirationRate').setValidators([Validators.required, Validators.min(0), Validators.max(60)]);
    this.obsForm.get('genObs.newsMandatory.oxygenSaturation').setValidators([Validators.required, Validators.min(50), Validators.max(100)]);
    this.obsForm.get('genObs.newsMandatory.pulseRate').setValidators([Validators.required, Validators.min(10), Validators.max(250)]);
    let diastolicValue = this.obsForm.get('genObs.newsMandatory.diastolicBP').value;
    this.obsForm.get('genObs.newsMandatory.diastolicBP').setValidators([Validators.required, Validators.min(10), Validators.max(150)]);;
    //this.obsForm.get('genObs.newsMandatory.systolicBP').setValidators([Validators.required, Validators.min(diastolicValue), Validators.max(500)]);

    if (this.obsForm.get('genObs.supplementalOxygen').value == "true") {
      this.obsForm.get('genObs.oxyGrp.inspiredOxygenPercentage').setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
      this.obsForm.get('genObs.oxyGrp.inspiredOxygenLitrePerMin').setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
      this.obsForm.get('genObs.oxyGrp.oxygenDevice').setValidators(Validators.required);
    }

    this.obsForm.get('genObs.supplementalOxygen').setValidators(this.isUnansweredValidator);
    this.obsForm.get('genObs.supplementalOxygen').updateValueAndValidity();

    this.obsForm.get('monitoringFrequency').setValidators(this.isUnansweredValidator);
    this.obsForm.get('monitoringFrequency').updateValueAndValidity();

    this.obsForm.get('reasonForIncomplete').clearValidators();
    this.obsForm.get('reasonForIncomplete').updateValueAndValidity();

    this.obsForm.get('otherObs.isPatientSick').setValidators(this.isUnansweredValidator);
    this.obsForm.get('otherObs.isPatientSick').updateValueAndValidity();

    this.obsForm.get('otherObs.concernsAboutPatient').setValidators(this.isUnansweredValidator);
    this.obsForm.get('otherObs.concernsAboutPatient').updateValueAndValidity();

    if (this.obsForm.get('otherObs.isPatientSick').value == "true") {
      this.obsForm.get('otherObs.couldBeInfection').setValidators(this.isUnansweredValidator);
      this.obsForm.get('otherObs.couldBeInfection').updateValueAndValidity();
    }


    this.obsForm.get('genObs.newsMandatory.consciousLevel').setValidators(Validators.required);

    for (const field in (<FormGroup>this.obsForm.get('genObs.newsMandatory')).controls) {
      const control = this.obsForm.get('genObs.newsMandatory.' + field);
      if (control) {
        control.updateValueAndValidity();
      }
    }

    for (const field in (<FormGroup>this.obsForm.get('genObs.oxyGrp')).controls) {
      const control = this.obsForm.get('genObs.oxyGrp.' + field);
      if (control) {
        control.updateValueAndValidity();
      }
    }

  }

  submitObs() {
    try {
      if (this.obsForm.valid) {

        this.subjects.closeObsForm.next({ result: "inprogress", message: "Please wait while the observations are being added..." });
        let eventcorrelationid = uuid();
        let observationevent_id = "";
        if (this.oldObservations)
          observationevent_id = this.oldObservations[0].observationevent_id;
        else
          observationevent_id = uuid();

        this.disableSubmit = true;
        //create an observation event
        let personID = this.appService.personId; //"804e7cf2-6b93-4baa-9801-7389d8391453";// "852ff654-fd30-4520-8025-fffa801fc962"; 
        let isAmend = this.oldObservations ? true : false;

        let escalationofcare = this.obsForm.getRawValue()["escalationofCare"];

        escalationofcare = escalationofcare == "true" ? true : (escalationofcare == "false" ? false : null);
        let monitoringfrequency = Number(this.obsForm.getRawValue()["monitoringFrequency"]);

        let newObsEvent = new Observationevent(
          observationevent_id,
          personID,
          this.getDateTimefromForm(),
          this.getDateTimefromForm(),
          this.appService.loggedInUserName,
          this.appService.encouter.encounter_id,
          isAmend,
          monitoringfrequency || 4,
          this.obsForm.getRawValue()["patientScale"],
          escalationofcare,
          this.obsForm.getRawValue()["reasonForAmend"],
          this.appService.loggedInUserName,
          this.obsForm.getRawValue()["reasonForIncomplete"], null, eventcorrelationid);

        this.appService.logToConsole(JSON.stringify(newObsEvent));

        //insert observations event
        this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/PostObject?synapsenamespace=core&synapseentityname=observationevent", JSON.stringify(newObsEvent)).
          subscribe((resp) => {
            //this.appService.logToConsole(this.obsForm.value);
            //insert observations
            let obsToPush: Array<{ key, value }> = [];
            this.getAllJsonKeys(this.obsForm.value, obsToPush);
            let weightUpdated = false;
            let heightUpdated = false;
            //console.warn(obsToPush);
            let observations: Array<Observation> = [];
            for (var i = 0; i < obsToPush.length; i++) {

              if ((typeof obsToPush[i].value == "boolean") || (typeof obsToPush[i].value == "number") || (obsToPush[i].value != null && obsToPush[i].value != ""))
                if (Object.keys(obsNames).includes(obsToPush[i].key)) {


                  let obsTypeId = this.obsTypes.filter(typ => typ.code == obsNames[obsToPush[i].key])[0].observationtype_id;
                  let obsUnits = "";
                  let measureId = "";

                  if (obsToPush[i].key == "height")
                    heightUpdated = true;

                  if (obsToPush[i].key == "weight")
                    weightUpdated = true;

                  //commenting this as measurement data is not available right now. uncomment in future. 
                  //let unitobj = this.obsMeasurement.filter(u => u.observationtype_id == obsTypeId);
                  //if (unitobj && unitobj.length > 0) {
                  //  obsUnits = unitobj[0].symbol;
                  //  measureId = unitobj[0].observationtypemeasurement_id;
                  //}
                  let observation_id = "";
                  let hasbeenammended = false;
                  if (this.oldObservations)
                    try {
                      observation_id = this.oldObservations.filter(x => x.observationtype_id == obsTypeId)[0].observation_id;
                      this.appService.logToConsole("found id for " + obsToPush[i].key + ":" + observation_id);

                      //compare old and new values
                      let oldvalue: any = this.oldObservations.filter(x => x.observationtype_id == obsTypeId)[0].value;
                      let oldAmendflag: any = this.oldObservations.filter(x => x.observationtype_id == obsTypeId)[0].hasbeenammended;
                      let newvalue = obsToPush[i].value;
                      //below 2 line are not required as checkboxes (boleans) are replaced by dropdown lists (strings) 13-aug 2019
                      //if (oldvalue == "true" || oldvalue == "false")
                      //  oldvalue = (oldvalue == "true");

                      if (oldAmendflag == "true" || oldAmendflag == true || newvalue != oldvalue) {
                        hasbeenammended = true;
                        this.appService.logToConsole(obsToPush[i].key + " amended")
                      }

                      //if on air
                      //Issue	20	Nursing App	Device data remains when Air/O2 is amended (on either complete or incomplete obs)	Expected behavior: when the amended observation changes from an O2 device to Air, the device should fall off the chart. 		P1	Update Observation Data Capture Forms to remove Device and O2 Flow Percentage if Air is selected

                      if (obsToPush[i].key == "inspiredOxygenPercentage" || obsToPush[i].key == "oxygenDevice" || obsToPush[i].key == "inspiredOxygenLitrePerMin") {
                        //delete old observation as patient is on Air
                        let so = obsToPush.filter(op => op.key == "supplementalOxygen")[0].value;

                        if (so == false || so == "false" || so == null || so == "null") {

                          //stop deleting the observation and set null value instead 23 oct 2019. [code in the end of this loop]
                          //this.apiRequest.deleteRequest(this.appService.baseURI + "/DeleteObject?synapsenamespace=core&synapseentityname=observation&id=" + observation_id)
                          //  .subscribe(
                          //    () => {

                          //    }, (error) => {
                          //      //error handling
                          //    });

                          //skip this observation
                          continue;
                        }
                      }

                      //delete could be infection answer if ispatient sick is false or null
                      if (obsToPush[i].key == "couldBeInfection") {
                        let isSick = obsToPush.filter(op => op.key == "isPatientSick")[0].value;
                        if (isSick == false || isSick == "false" || isSick == null || isSick == "null") {
                          this.apiRequest.deleteRequest(this.appService.baseURI + "/DeleteObject?synapsenamespace=core&synapseentityname=observation&id=" + observation_id)
                            .subscribe(
                              () => {

                              }, (error) => {
                                //error handling
                              });

                          //skip this observation
                          continue;
                        }
                      }

                      //check if this is height/weight and update height/weight updated status, requried to emit patient banner update event back to framewoek
                      if (obsToPush[i].key == "height" && newvalue == oldvalue)
                        heightUpdated = false;

                      if (obsToPush[i].key == "weight" && newvalue == oldvalue)
                        weightUpdated = false;

                    } catch{ this.appService.logToConsole("no id for :" + obsToPush[i].key); observation_id = uuid(); }
                  else
                    observation_id = uuid();

                  //if supplemental oxygen is not true do not add device data.
                  if (obsToPush[i].key == "inspiredOxygenPercentage" || obsToPush[i].key == "oxygenDevice" || obsToPush[i].key == "inspiredOxygenLitrePerMin") {
                    let so = obsToPush.filter(op => op.key == "supplementalOxygen")[0].value;
                    if (so == false || so == "false" || so == null || so == "null") {
                      continue;
                    }
                  }

                  //if ispatientsick is not trur do not add couldbeinfection answer
                  if (obsToPush[i].key == "couldBeInfection") {
                    let isSick = obsToPush.filter(op => op.key == "isPatientSick")[0].value;
                    if (isSick == false || isSick == "false" || isSick == null || isSick == "null") {
                      continue;
                    }
                  }



                  if (observation_id != "")
                    observations.push(new Observation(
                      observation_id,
                      obsUnits,
                      "",
                      newObsEvent.datefinished,
                      newObsEvent.observationevent_id,
                      this.obsTypes.filter(typ => typ.code == obsNames[obsToPush[i].key])[0].observationtype_id,
                      measureId,
                      obsToPush[i].value,
                      hasbeenammended,
                      this.appService.loggedInUserName,
                      eventcorrelationid
                    ));
                }
            }

            //if a previously added observation is made blank in the form, add a null value; limited to o2device inspired o2 percentage and litre.min
            if (this.oldObservations)
              for (var i = 0; i < this.oldObservations.length; i++) {
                let res = this.obsTypes.filter(typ => typ.observationtype_id == this.oldObservations[i].observationtype_id);
                if (res && (res[0].code == "OXYGENDEV" || res[0].code == "INSPIREO2PERCENTAGE" || res[0].code == "INSPIREO2LITREPERMIN") && this.oldObservations[i].value != null)
                  if (observations.filter(obs => obs.observation_id == this.oldObservations[i].observation_id).length == 0)
                    observations.push(new Observation(
                      this.oldObservations[i].observation_id,
                      "",
                      "",
                      newObsEvent.datefinished,
                      newObsEvent.observationevent_id,
                      this.oldObservations[i].observationtype_id,
                      "",
                      null,
                      true,
                      this.appService.loggedInUserName,
                      eventcorrelationid
                    ));

              }

            this.appService.logToConsole(JSON.stringify(observations));

            this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI + "/PostObjectArray?synapsenamespace=core&synapseentityname=observation", JSON.stringify(observations)).
              subscribe((resp) => {

                //obs created, close modal
                this.subjects.closeObsForm.next({ result: "complete", message: "Observations Added. Getting Guidance..." });
                if (heightUpdated || weightUpdated)
                  this.updateFrameworkEvents.emit("UPDATE_HEIGHT_WEIGHT");
                //obs created, call autonomic for score
                this.subscriptions.add(this.apiRequest.getRequest(this.appService.autonomicsBaseURI + "/EWS/CalculateNEWS2/" + observationevent_id).subscribe(
                  (g) => {
                    let guidance = JSON.parse(g);
                    if (guidance.status.toLowerCase() == "success") {
                      this.subjects.showMessage.next({
                        result: "inprogress", message: "<h5>NEWS2 Score: " + guidance.score + "</h5>", timeout: 10000
                      })

                      //do not change guidance.guidance below // News guidlines componet uses this text in a logic to decide single value 3 score 
                      this.subjects.openGuidance.next({ score: guidance.score, observationevent_id: newObsEvent.observationevent_id, guidance: guidance.guidance });
                    }
                    else {
                      this.subjects.showMessage.next({ result: "failed", message: "Could not calculate EWS Score: " + guidance.error })
                    }
                    this.subjects.drawGraph.next();
                    this.updateFrameworkEvents.emit("UPDATE_EWS");
                  },
                  () => { this.subjects.drawGraph.next(); }));

              }, (err_obs) => {
                //error creating obs, show message, delete created obsevent. 
                //delete created obsevent
                if (!this.oldObservations)
                  this.apiRequest.deleteRequest(this.appService.baseURI + "/DeleteObject?synapsenamespace=core&synapseentityname=observationevent&id=" + newObsEvent.observationevent_id);
                this.appService.logToConsole("error creating observations:");
                this.appService.logToConsole(err_obs);
                this.subjects.closeObsForm.next({ result: "failed", message: "There was an error adding observations: " + err_obs });
              }));
          }, (err_obsevent) => {
            this.appService.logToConsole("error creating observations event");
            this.appService.logToConsole(err_obsevent);
            this.subjects.closeObsForm.next({ result: "failed", message: "There was an error adding observations event: " + err_obsevent });
          }));

      }
      else {

        for (const field in (<FormGroup>this.obsForm.get('genObs.newsMandatory')).controls) {
          const control = this.obsForm.get('genObs.newsMandatory.' + field);
          if (control) {
            control.markAsTouched({ onlySelf: true });
          }
        }
        for (const field in (<FormGroup>this.obsForm.get('genObs.oxyGrp')).controls) {
          const control = this.obsForm.get('genObs.oxyGrp.' + field);
          if (control) {
            control.markAsTouched({ onlySelf: true });
          }
        }
        for (const field in (<FormGroup>this.obsForm.get('otherObs')).controls) {
          const control = this.obsForm.get('otherObs.' + field);
          if (control) {
            control.markAsTouched({ onlySelf: true });
          }
        }
        this.obsForm.get('genObs.supplementalOxygen').markAsTouched({ onlySelf: true });
        this.obsForm.get('monitoringFrequency').markAsTouched({ onlySelf: true });
        this.obsForm.get('reasonForAmend').markAsTouched({ onlySelf: true });
        this.obsForm.get('reasonForIncomplete').markAsTouched({ onlySelf: true });



      }
    }
    catch (error) {
      this.subjects.closeObsForm.next({ result: "failed", message: "There was an error : " + error });
    }
  }

  public getAllJsonKeys(json: any, result: Array<{}>) {
    for (var key in json) {
      if (json.hasOwnProperty(key)) {
        if (typeof json[key] != "object") {
          result.push({ "key": key, "value": json[key] });
        } else
          this.getAllJsonKeys(json[key], result);
      }
    }
  }

  public noWhitespaceValidator(control: FormControl) {
    const isWhitespace = (control.value || '').trim().length === 0;
    const isValid = !isWhitespace;
    return isValid ? null : { 'whitespace': true };
  }

  public maxTimeValidator(form: any) {
    return (control: AbstractControl): { [key: string]: any } | null => {

      if (form && form.obsForm) {

        if (control.value && form.obsForm.getRawValue()["observationDate"]) {
          const value = new Date(moment(form.getDateTimefromForm(), moment.ISO_8601).toString());
          //for current encounter, date time should not be greater than curent date time
          //for previous encounter, date time should not be greater than discharge date time.

          //current encounter
          let compareDate = new Date();
          let isPrevious = false;

          //previoud encounter
          if (form.appService.encouter && form.appService.encouter.dischargedatetime) {
            compareDate = new Date(moment(form.appService.encouter.dischargedatetime, moment.ISO_8601).toString());
            isPrevious = true;
          }

          if (moment(value).second(0).millisecond(0).isAfter(moment(compareDate).second(0).millisecond(0)))
            return isPrevious ? { "afterDischarge": true } : { "inFuture": true };
        }
        else {
          return { "isEmpty": true }

        }
      }
      return null;
    };
  }

  public isUnansweredValidator(control: FormControl) {
    const isUnanswered = control.value == null || (control.value || '').trim() === "null"
    return !isUnanswered ? null : { 'unanswered': true };
  }


}
