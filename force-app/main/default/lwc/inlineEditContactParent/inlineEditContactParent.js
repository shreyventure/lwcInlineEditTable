import { LightningElement, api, wire, track } from "lwc";
import getAssociatedContacts from "@salesforce/apex/ContactsAssociated.getAssociatedContacts";
import newContactModal from "c/newContactModal";
import { refreshApex } from "@salesforce/apex";
import { deleteRecord } from "lightning/uiRecordApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

export default class InlineEditContactParent extends LightningElement {
  @api recordId;
  contactsData;
  @track contacts;
  error;
  cardTitle;
  accountName;

  @wire(getAssociatedContacts, { accId: "$recordId" })
  getTheAssociatedContacts(wiredData) {
    this.contactsData = wiredData;
    const { error, data } = wiredData;
    if (data) {
      this.contacts = data;
      this.accountName = data[0].Account.Name;
      this.cardTitle = "Contacts (" + data.length + ")";
      this.error = undefined;
    } else if (error) {
      this.error = error;
      this.data = undefined;
    }
  }

  async handleCreateNewContact() {
    try {
      const res = await newContactModal.open({
        accId: this.recordId,
        accName: this.accountName
      });
      console.log(res);
      if (res === "Saved") {
        console.log("refreshing Apex");
        this.dispatchEvent(
          new ShowToastEvent({
            title: "Success",
            message: "Contact added!",
            variant: "success"
          })
        );
        return refreshApex(this.contactsData);
      }
    } catch (error) {
      console.log(error.message);
    }
    return null;
  }

  handleDelete(event) {
    console.log("Handling delete event");
    console.log(event.detail.conId);
    deleteRecord(event.detail.conId)
      .then(() => {
        this.dispatchEvent(
          new ShowToastEvent({
            title: "Success",
            message: "Contact deleted!",
            variant: "success"
          })
        );
        return refreshApex(this.contactsData);
      })
      .catch((error) => {
        this.dispatchEvent(
          new ShowToastEvent({
            title: "Error deleting record",
            message: error.body.message,
            variant: "error"
          })
        );
      });
  }

  async handleEdit() {
    try {
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Success",
          message: `Contact details were updated successfully!`,
          variant: "success"
        })
      );
      return refreshApex(this.contactsData);
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Error",
          message: `Something went wrong. '${error.message}'`,
          variant: "error"
        })
      );
    }
    return null;
  }

  handleError(event) {
    console.log("handlingError");
    let errorMsg = event.detail.message;
    this.dispatchEvent(
      new ShowToastEvent({
        title: "Error",
        message: errorMsg,
        variant: "error"
      })
    );
  }

  handleRefresh() {
    console.log("refreshed");
    return refreshApex(this.contactsData);
  }
}