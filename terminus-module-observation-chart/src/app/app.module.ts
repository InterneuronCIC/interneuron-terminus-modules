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

import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { EncounterNavigationComponent } from './encounter-navigation/encounter-navigation.component';
import { HttpClientModule } from '@angular/common/http';
import { NewObservationComponent } from './new-observation/new-observation.component';
import { ObservationChartComponent } from './observation-chart/observation-chart.component';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TimepickerModule } from 'ngx-bootstrap/timepicker';
import { ModalModule } from 'ngx-bootstrap/modal';
import { AlertModule } from 'ngx-bootstrap/alert';
import { InformationPopupComponent } from './information-popup/information-popup.component';
import { Injector } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { DatePipe } from '@angular/common';
import { PersonScaletypeComponent } from './person-scaletype/person-scaletype.component';
import { DeleteObservationeventComponent } from './delete-observationevent/delete-observationevent.component';
import { InputKeyPressDirective } from './input-key-press.directive';
import { NewsGuidlinesComponent } from './news-guidlines/news-guidlines.component';
import { NumberOnlyDirective } from './number-only.directive';
import { NonNegativeNumbersDirective } from './non-negative-numbers.directive';


@NgModule({
  declarations: [
    AppComponent,
    EncounterNavigationComponent,
    NewObservationComponent,
    ObservationChartComponent,
    InformationPopupComponent,
    PersonScaletypeComponent,
    DeleteObservationeventComponent,
    InputKeyPressDirective,
    NewsGuidlinesComponent,
    NumberOnlyDirective,
    NonNegativeNumbersDirective

  ],
  imports: [
    BrowserModule, HttpClientModule,
    ReactiveFormsModule,
    BsDatepickerModule.forRoot(),
    BrowserAnimationsModule,
    TimepickerModule.forRoot(),
    ModalModule.forRoot(),
    AlertModule.forRoot()
  ],
  providers: [DatePipe],
  bootstrap: [AppComponent],
  entryComponents: [AppComponent]
})
export class AppModule {
  constructor(private injector: Injector) {
  }

  ngDoBootstrap() {
    const el = createCustomElement(AppComponent, { injector: this.injector });
    customElements.define('app-element', el);  // "customelement-selector" is the dom selector that will be used in parent app to render this component
  }
}
