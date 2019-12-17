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

import { Injectable, OnInit } from '@angular/core';
import { Encounter } from '../models/encounter.model';
import { PersonObservationScale } from '../models/observations.model';
import { Subscription } from 'rxjs';
import * as jwt_decode from "jwt-decode";
import { isDevMode } from '@angular/core';



@Injectable({
  providedIn: 'root'
})
export class AppService {
  subscriptions: Subscription;
  public personId: string;
  public encouter: Encounter;
  public chartJson: JSON;
  public chartDataJson: JSON;
  public isCurrentEncouner: boolean = false;
  public apiService: any;
  personscale: PersonObservationScale = null;
  public baseURI: string; 
  public autonomicsBaseURI: string;
  public appConfig: any = null;
  public loggedInUserName: string = null;
  public enableLogging: boolean = true;
  constructor() { }

  decodeAccessToken(token: string): any {
    try {
      return jwt_decode(token);
    }
    catch (Error) {
      return null;
    }
  }

  logToConsole(msg: any) {
    if (this.enableLogging) {
      console.log(msg);
    }
  }
}
