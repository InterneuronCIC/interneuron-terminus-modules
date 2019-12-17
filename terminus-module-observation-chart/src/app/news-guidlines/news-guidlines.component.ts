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
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { SubjectsService } from '../services/subjects.service';
import { ViewEncapsulation } from '@angular/compiler/src/core';

@Component({
  selector: 'app-news-guidlines',
  templateUrl: './news-guidlines.component.html',
  styleUrls: ['./news-guidlines.component.css'],
})
export class NewsGuidlinesComponent implements OnInit {

  ewsScoreHeader: string = "";
  observationEvent: any = {};
  subscriptions: Subscription = new Subscription();
  backColor = "";
  @ViewChild('openGuidance') openGuidance: ElementRef;
  @ViewChild('closeGuidance') closeGuidance: ElementRef;
  constructor(private subjects: SubjectsService) {

    this.subscriptions.add(this.subjects.openGuidance.subscribe
      ((event: any) => {
        this.ewsScoreHeader = event.score;
        var backColor = event.guidance.split(" ")[0];
        if (backColor == "LOW/MEDIUM") {
          backColor = "LOW-MEDIUM";
        }
        this.backColor = "EWS_" + backColor;
        this.observationEvent = {};
        this.openModal();
      }));

  }

  openModal() {
    this.openGuidance.nativeElement.click();
  }
  closeModal() {
    this.closeGuidance.nativeElement.click();
  }
  ngOnInit() {
  }

}
