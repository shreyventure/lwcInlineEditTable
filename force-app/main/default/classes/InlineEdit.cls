public with sharing class InlineEdit {
  @AuraEnabled
  public static void inlineUpdate(String contactsStr) {
    try {
      List<Contact> contacts = (List<Contact>) JSON.deserialize(
        contactsStr,
        List<Contact>.class
      );
      System.debug('Contacts: ' + contacts);
      update contacts;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }
}