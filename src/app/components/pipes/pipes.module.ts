import { NgModule } from '@angular/core';
import { TimestampToDatePipe } from './timestamp-to-date/timestamp-to-date';
import { SanitizingHtmlPipe } from './sanitizing-html/sanitizing-html';
import { BadgeLimitPipe } from './badge-limit/badge-limit';
import { NgxLinkifyjsModule } from 'ngx-linkifyjs';
import {ConvertLineBreakPipe} from './convert-line-break.pipe';
import {RemoveHtmlPipe} from './remove-html.pipe';

@NgModule({
	declarations: [
    TimestampToDatePipe,
    SanitizingHtmlPipe,
    BadgeLimitPipe,
    ConvertLineBreakPipe,
    RemoveHtmlPipe,
  ],
	imports: [
    NgxLinkifyjsModule.forRoot(),
  ],
	exports: [
    TimestampToDatePipe,
    SanitizingHtmlPipe,
    BadgeLimitPipe,
    NgxLinkifyjsModule,
    ConvertLineBreakPipe,
    RemoveHtmlPipe,
  ]
})
export class PipesModule {}
