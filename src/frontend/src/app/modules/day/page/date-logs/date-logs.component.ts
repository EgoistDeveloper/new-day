import { Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import moment from 'moment';
import * as CKEditor from '@ckeditor/ckeditor5-build-balloon-block';
import { BlurEvent, FocusEvent } from '@ckeditor/ckeditor5-angular/ckeditor.component';

import { Subscription } from 'rxjs';
import { Apollo, QueryRef } from 'apollo-angular';
import { FirstDaybookDateLogData, IDaybookLog, IFirstDaybookDateLog } from '@data/models/daybook/daybook-log';
import { DaybookDateRootObject, IDaybookDate, DaybookDate} from '@data/models/daybook/daybook-date';
import { DaybookLogService } from '@data/graphql/daybook/daybook-log.service';
import { DaybookRootObject, IDaybook, Daybook } from '@data/models/daybook/daybook';
import { DaybookService } from '@data/graphql/daybook/daybook.service';

@Component({
  selector: 'app-date-logs',
  templateUrl: './date-logs.component.html',
  styleUrls: ['./date-logs.component.scss']
})
export class DateLogsComponent implements OnInit {
  @ViewChildren('editTitleInput') editTitleInputs: QueryList<ElementRef>;

  public daybook: IDaybook = new Daybook();
  public daybookDate: IDaybookDate = new DaybookDate();
  public dateLogs: any;

  public selectedDate: any;
  public selectedBookId: any;
  public currentDateLog: any;

  private daybookQuery: QueryRef < any > ;
  private daybookQuerySubscription: Subscription;

  private daybookDateQuery: QueryRef < any > ;
  private daybookDateQuerySubscription: Subscription;

  public editor = CKEditor;
  public editorConfig = {
    placeholder: 'Add some log...'
  };

  public isLoading: boolean;
  public isToday: any;

  constructor(
    private daybookService: DaybookService,
    private daybookLogService: DaybookLogService,
    private route: ActivatedRoute,
    private apollo: Apollo,
    private spinner: NgxSpinnerService,
    //private toastr: ToastrService,
    //private modalService: NgbModal,
    private router: Router,
  ) {
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.selectedBookId = params.get('id'),
      this.selectedDate = params.get('date');

      if (this.selectedBookId){
        this.daybookQuery = this.apollo.watchQuery < DaybookRootObject > ({
          query: this.daybookService.getBook(this.selectedBookId)
        });
      } else {
        // Tood: nofity about missing some things
      }

      this.daybookDateQuery = this.apollo.watchQuery < DaybookDateRootObject > ({
        query: this.daybookLogService.getDaybookDate(this.selectedBookId, this.selectedDate)
      });
    });

    this.isToday = moment().diff(this.selectedDate, 'days');
  }

  ngOnInit(): void {
    this.loadLogs();
  }

  public getDaybook(){
    this.isLoading = true;
    this.spinner.show(`bookDateSpinner`);

    this.daybookQuerySubscription = this.daybookQuery
    .valueChanges
    .subscribe(({
      data,
      loading
    }) => {
      this.daybook = data.daybook;

      this.loadLogs();
    });
  }

  public loadLogs(){
    this.isLoading = true;
    this.spinner.show(`bookDateSpinner`);

    this.daybookDateQuerySubscription = this.daybookDateQuery
    .valueChanges
    .subscribe(({
      data,
      loading
    }) => {
      if (data.daybook){
        this.daybook = data.daybook;
      }

      if (data.daybookDate && data.daybookDate.logs.length){
        this.daybookDate = data.daybookDate;

        this.dateLogs = data.daybookDate.logs.map((item: any) => ({
          ...item,
          isSaving: false,
          isEditing: false
        }));
      }

      this.isLoading = loading;
      this.spinner.hide(`bookDateSpinner`);
    });
  }

  public addLog(){
    this.isLoading = true;
    this.spinner.show(`bookDateSpinner`);

    if (!this.daybookDate){
      this.apollo.mutate({
        mutation: this.daybookLogService.firstDaybookDateLog(this.daybook.id, this.selectedDate)
      }).subscribe(({data}: FirstDaybookDateLogData | any) => {
        if (data.firstDaybookDateLog){
          this.daybookDate = data.firstDaybookDateLog.daybook_date;

          this.dateLogs = [data.firstDaybookDateLog].map((item) => ({
            ...item,
            isSaving: false,
            isEditing: false
          }));
        } else{
          // Todo: show message
        }

        this.isLoading = false;
        this.spinner.hide(`bookDateSpinner`);
      });
    } else {
      this.apollo.mutate({
        mutation: this.daybookLogService.createDaybookDateLog(this.daybook.id, this.daybookDate.id)
      }).subscribe(({data}: any) => {
        if (data.createDaybookDateLog){
          let newLog = ({
            ...data.createDaybookDateLog,
            isSaving: false,
            isEditing: false
          });

          this.dateLogs.unshift(newLog);
        }

        this.isLoading = false;
        this.spinner.hide(`bookDateSpinner`);
      });
    }
  }

  public updateLog(data: any, dateLog: any){
    if (data !== dateLog.log){
      this.isLoading = false;

      dateLog.isSaving = true;

      this.apollo.mutate({
        mutation: this.daybookLogService.updateDaybookDateLog(dateLog.id, dateLog.title, data)
      }).subscribe(({_data}: any) => {
        dateLog.log = data;
        dateLog.isSaving = false;
        dateLog.updated_at = _data.updateDaybookDateLog.updated_at;

        this.isLoading = false;
      });
    }
  }

  public onFocusEditor({ editor }: FocusEvent, dateLog: any){
    this.currentDateLog = dateLog;
  }

  public onBlurEditor({ editor }: BlurEvent, dateLog: any) {
    this.currentDateLog = null;

    const data = editor.getData();

    this.updateLog(data, dateLog);
  }

  public onFocusLogTitle(index: number, dateLog: any){
    dateLog.isEditing = true;

    setTimeout(() => {
      this.editTitleInputs.toArray()[0].nativeElement.focus();
    }, 250);
  }

  public onBlurLogTitle(event: any, dateLog: any){
    if (!dateLog.title || dateLog.title == event.target.value){
      dateLog.isSaving = false;
      dateLog.isEditing = false;

      return;
    }

    dateLog.isSaving = true;

    this.isLoading = false;

    this.apollo.mutate({
      mutation: this.daybookLogService.updateDaybookDateLog(dateLog.id, dateLog.title, dateLog.log)
    }).subscribe(({data}: any) => {
      dateLog.updated_at = data.updateDaybookDateLog.updated_at;
      dateLog.isSaving = false;
      dateLog.isEditing = false;

      this.isLoading = false;
    });
  }
}
