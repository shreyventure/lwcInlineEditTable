import { api, LightningElement, track, wire } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import DeleteConfirmationModal from "c/deleteConfirmationModal";
import newContactModal from "c/newContactModal";
import { getObjectInfo, getPicklistValues } from "lightning/uiObjectInfoApi";
import CONTACT from "@salesforce/schema/Contact";
import LEAD_SOURCE_FIELD from "@salesforce/schema/Contact.LeadSource";
import inlineUpdate from "@salesforce/apex/InlineEdit.inlineUpdate";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

export default class InlineContactChild extends LightningElement {
  @api accid;
  @api accname;
  displayedSection;

  inlineEditContactId;
  inlineEditFieldName;
  inlineEditChangedValue;
  isChanged;
  isChangedCurrent;
  sectionDataId;
  leadSourceOptions;

  inlineEdit = {};
  changedRecords = [];
  changedDataCells = [];
  @track isEditing = false;

  contactsObj;
  @api
  get contacts() {
    return this.contactsObj;
  }

  set contacts(value) {
    let tempVal = JSON.parse(JSON.stringify(value));
    tempVal.forEach((element) => {
      element.inlinefnameId = "FirstName-" + element.Id;
      element.inlinelnameId = "LastName-" + element.Id;
      element.inlinebirthdateId = "Birthdate-" + element.Id;
      element.inlineleadsourceId = "LeadSource-" + element.Id;
      element.inlineemailId = "Email-" + element.Id;
    });
    this.contactsObj = tempVal;
  }

  @wire(getObjectInfo, { objectApiName: CONTACT })
  objectInfo;

  @wire(getPicklistValues, {
    recordTypeId: "$objectInfo.data.defaultRecordTypeId",
    fieldApiName: LEAD_SOURCE_FIELD
  })
  fetchLeadSourcePicklistValues({ error, data }) {
    if (data) {
      this.leadSourceOptions = data.values;
    } else if (error) {
      console.log("Error: " + JSON.stringify(error));
      this.leadSourceOptions = undefined;
    }
  }

  handleNavigation(event) {
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        recordId: event.target.id.split("-")[0],
        objectApiName: "Contact",
        actionName: "view"
      }
    });
  }

  async handleDelete(event) {
    console.log(event.target.id);
    let conId = event.target.id.split("-")[0];
    try {
      const res = await DeleteConfirmationModal.open({});
      console.log("REs: " + res);
      if (res === "proceed") {
        console.log("In if ");
        console.log(conId);
        const deleteEvent = new CustomEvent("deletecontact", {
          detail: { conId: conId }
        });

        this.dispatchEvent(deleteEvent);
      }
    } catch (error) {
      console.log(error.message);
    }
  }

  async handleEdit(event) {
    let conId = event.target.id.split("-")[0];
    let contact = this.contactsObj.filter((con) => con.Id === conId);
    try {
      const res = await newContactModal.open({
        contact: contact,
        accId: this.accid,
        accName: this.accname,
        mode: "EDIT"
      });
      console.log(res);
      if (res === "success") {
        this.dispatchEvent(
          new CustomEvent("editcontact", {
            detail: { contact: contact[0] }
          })
        );
      }
    } catch (error) {
      console.log(error);
    }
  }

  handleInlineEdit(event) {
    console.log("data id: " + event.currentTarget.dataset.id);
    console.log("data fieldname: " + event.currentTarget.dataset.fieldname);
    this.inlineEditFieldName = event.currentTarget.dataset.fieldname;
    this.inlineEditContactId = event.currentTarget.dataset.id;
    this.inlineEditChangedValue = event.currentTarget.dataset.value;
    this.sectionDataId =
      event.currentTarget.dataset.fieldname +
      "-" +
      event.currentTarget.dataset.id;
    console.log(this.sectionDataId);
    if (this.displayedSection) {
      this.displayedSection.style.display = "none";
    }
    this.displayedSection = this.template.querySelector(
      `[data-inlinesectionid=${this.sectionDataId}]`
    );
    this.displayedSection.style.display = "block";
    this.displayedSection.focus();
    this.isEditing = true;
  }

  handleInlineEditOnChange(event) {
    this.inlineEditChangedValue = event.target.value;
    this.isChanged = true;
    this.isChangedCurrent = true;
  }

  handleInlineCancel() {
    this.reset("cancel");
  }

  handleInlineOffFocus() {
    console.log("Handling off focus");
    this.displayedSection.style.display = "none";
    if (this.isChanged && this.isChangedCurrent) {
      let changedRecs = JSON.parse(JSON.stringify(this.changedRecords));
      console.log(changedRecs);
      let record = changedRecs.filter(
        (rec) => rec.Id === this.inlineEditContactId
      )[0];
      console.log("record: " + JSON.stringify(record));
      if (record) {
        changedRecs = changedRecs.filter(
          (rec) => rec.Id !== this.inlineEditContactId
        );
        record[this.inlineEditFieldName] = this.inlineEditChangedValue;
        changedRecs.push(record);
      } else {
        record = {};
        record.Id = this.inlineEditContactId;
        record[this.inlineEditFieldName] = this.inlineEditChangedValue;
        console.log("Updated: " + record);
        changedRecs.push(record);
      }
      this.changedRecords = changedRecs;
      let tableDataChanged = this.template.querySelector(
        `[data-inlineid=${this.sectionDataId}]`
      );
      console.log(tableDataChanged.children[0].children[0]);
      tableDataChanged.children[0].children[0].innerText =
        this.inlineEditChangedValue;

      tableDataChanged.style.background = "#FFFED1";
      this.changedDataCells.push(tableDataChanged);
      console.log("Chang: " + JSON.stringify(this.changedRecords));
      this.isChangedCurrent = false;
    }
  }

  handleInlineSave() {
    console.log("Changed recs: " + JSON.stringify(this.changedRecords));
    this.displayedSection.style.display = "none";
    this.isEditing = false;
    console.log("Updating");
    let valid = this.isValid();
    console.log("Validating");
    if (!valid) {
      this.handleInlineCancel();
      return;
    }

    inlineUpdate({ contactsStr: JSON.stringify(this.changedRecords) })
      .then(() => {
        console.log("success!");
        this.dispatchEvent(
          new ShowToastEvent({
            title: "Success",
            message: "Contacts updated!",
            variant: "success"
          })
        );
        this.dispatchEvent(new CustomEvent("refresh"));
        this.changeBackgrounds();
        this.reset("save");
      })
      .catch((error) => {
        console.log(error);
        this.dispatchEvent(
          new ShowToastEvent({
            title: "Error",
            message: "Something went wrong!",
            variant: "error"
          })
        );
      });
  }

  changeBackgrounds() {
    for (const dataCell of this.changedDataCells) {
      dataCell.style.background = "none";
    }
  }

  reset(mode) {
    this.changeBackgrounds();
    if (mode === "cancel") {
      for (const dataCell of this.changedDataCells) {
        dataCell.children[0].children[0].innerText =
          dataCell.children[0].children[0].title;
      }
    }
    this.displayedSection.style.display = "none";
    this.isEditing = false;
    this.changedRecords = [];
    this.changedDataCells = [];
    this.isChanged = false;
    this.isChangedCurrent = false;
  }

  isValid() {
    if (
      this.inlineEditFieldName === "LastName" &&
      this.inlineEditChangedValue.trim() === ""
    ) {
      this.dispatchEvent(
        new CustomEvent("error", {
          detail: { message: "Last Name value cannot be blank." }
        })
      );
      return false;
    }
    return true;
  }
}