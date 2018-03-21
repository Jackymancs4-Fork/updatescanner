import {backgroundActionEnum} from 'background/actions';
import * as autoscan from 'scan/autoscan';
import {scan} from 'scan/scan';
import {showNotification} from 'scan/notification';
import {PageStore, hasPageStateChanged, isItemChanged} from 'page/page_store';
import {isUpToDate, latestVersion} from 'update/update';
import {openUpdate} from 'update/update_url';
import {log} from 'util/log';
import {Config} from 'util/config';

const activeIcon = {
  18: '/images/updatescanner_18.png',
  48: '/images/updatescanner_48.png',
  64: '/images/updatescanner_64.png',
};

/**
 * Class representing the Update Scanner background process.
 */
export class Background {
  /**
   * @property {PageStore} pageStore - Object used for saving and loading data
   * from storage.
   */
  constructor() {
    this.pageStore = null;
  }

  /**
   * Start the background processes and listeners.
   */
  async init() {
    this.pageStore = await PageStore.load();
    this.pageStore.bindPageUpdate(this._handlePageUpdate.bind(this));
    browser.runtime.onMessage.addListener(this._handleMessage.bind(this));

    this._refreshIcon();
    this.pageStore.refreshFolderState();
    await this._checkFirstRun();
    await this._checkIfUpdateRequired();

    // @FIXME: Autoscan should take pageStore as a parameter
    autoscan.start();
  }

  /**
   * Called when a Page is updated in Storage. Refresh the icon if its state
   * changed.
   *
   * @param {string} pageId - ID of the changed Page.
   * @param {storage.StorageChange} change - Object representing the change.
   */
  _handlePageUpdate(pageId, change) {
    if (hasPageStateChanged(change)) {
      this._refreshIcon();
      this.pageStore.refreshFolderState();
    }
  }

  /**
   * Called when a message is sent to the background process.
   *
   * @param {Object} message - Message content.
   */
  async _handleMessage(message) {
    if (message.action == backgroundActionEnum.SCAN_ALL) {
      await this._scanAll();
    } else if (message.action == backgroundActionEnum.SCAN_ITEM) {
      await this._scanItem(message.itemId);
    }
  }

  /**
   * Refresh the browserAction icon and badge text.
   */
  _refreshIcon() {
    const updateCount = this.pageStore.getPageList()
      .filter(isItemChanged).length;

    browser.browserAction.setIcon({path: activeIcon});
    if (updateCount == 0) {
      browser.browserAction.setBadgeText({text: ''});
    } else {
      browser.browserAction.setBadgeText({text: updateCount.toString()});
    }
  }

  /**
   * If this is the first time the addon has been run, create a Page with
   * the Update Scanner website and scan it immediately.
   */
  async _checkFirstRun() {
    const config = await new Config().load();
    if (config.get('isFirstRun')) {
      const page = await this.pageStore.createWebsitePage();
      scan([page]);
      config.set('isFirstRun', false);
      config.set('updateVersion', latestVersion);
      await config.save();
    }
  }

  /**
   * If the data structures aren't up to date, open the Update page to perform
   * an update.
   */
  async _checkIfUpdateRequired() {
    if (!(await isUpToDate())) {
      openUpdate();
    }
  }

  /**
   * Manual scan of all Pages in the PageStore.
   */
  async _scanAll() {
    this._scanItem(PageStore.ROOT_ID);
  }

  /**
   * Manual scan of a single item. If the item is a PageFolder, scan all items
   * in the folder.
   *
   * @param {string} itemId - ID of the item to scan.
   */
  async _scanItem(itemId) {
    const scanList = this.pageStore.getDescendantPages(itemId);

    log(`Pages to manually scan: ${scanList.length}`);
    const newMajorChangeCount = await scan(scanList);
    log(`Manual scan complete, ${newMajorChangeCount} new changes detected.`);

    // If the user has already viewed some changes, don't include in the count
    const changeCount = this.pageStore.getChangedPageList().length;
    const notifyChangeCount = Math.min(newMajorChangeCount, changeCount);

    showNotification(notifyChangeCount);
  }
}
