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

import { Directive ,HostListener} from '@angular/core';
import { SubjectsService } from 'src/app/services/subjects.service';
type IKNOWISNUMBER = any;
type IKNOWISSTRING = any;
@Directive({
  selector: '[enterIsNext]'
})
export class InputKeyPressDirective {


  @HostListener('keydown', ['$event'])
  onInput(e: any) {
    if (e.which === 13) {
      var form = e.target.form;
    var index = Array.prototype.indexOf.call(form, event.target);
    form.elements[index + 1].focus();
    event.preventDefault();
    }
  }
  constructor() { 
  }

 
}
