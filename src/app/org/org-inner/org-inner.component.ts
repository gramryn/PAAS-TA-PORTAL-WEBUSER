import {CommonService} from '../../common/common.service';
import {OrgQuota} from '../../model/org-quota';
import {Organization} from '../../model/organization';
import {Space} from '../../model/space';
import {SpaceService} from '../../space/space.service';
import {OrgQuotaService} from '../common/org-quota.service';
import {OrgService} from '../common/org.service';
import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  AfterContentChecked,
  AfterViewChecked,
  DoCheck
} from '@angular/core';
import {NGXLogger} from 'ngx-logger';
import {OrgUserRoleService} from "../common/org-userrole.service";
import {DomainService} from "../../domain/domain.service";
import {Domain} from "../../model/domain";
import {OrgUserRole} from "../../model/userrole";

declare var $: any;
declare var jQuery: any;

@Component({
  selector: 'app-org-inner',
  templateUrl: './org-inner.component.html',
  styleUrls: [
    // Is this needed really?
    // '../../../assets/resources/css/common.css',
    // '../../../assets/resources/css/normalize.css',
    '../common/org.component.css',
    './org-inner.component.css',
  ],
})
export class OrgInnerComponent implements OnInit, AfterViewChecked {
  @Input('org') org: Organization;
  @Input('wantedOrgName') wantedOrgName: String;

  private _availableQuotas: Array<OrgQuota>;
  private _domains: Array<Domain>;
  private _orgUserRoles: Array<OrgUserRole>;
  private _isOrgManager: boolean = true;
  private exactlyQuotaIndex = null;

  private createSpaceName: String = "";  // Space name it's wanted to create
  private selectSpace: Space = Space.empty();
  private selectQuota: OrgQuota = OrgQuota.empty();

  private selectUserRole: OrgUserRole = OrgUserRole.empty();

  @Output() selectEvent = new EventEmitter<Organization>();

  private defaultValue = '(dummy)';

  constructor(private orgService: OrgService,
              private spaceService: SpaceService,
              private domainService: DomainService,
              private orgUserRoleService: OrgUserRoleService,
              private quotaService: OrgQuotaService,
              private common: CommonService,
              private logger: NGXLogger) {
    this.common.isLoading = true;
  }

  ngOnInit(): void {
    const orgId = this.org.guid;
    this.setSpaces(this.spaceService.getOrgSpaceList(orgId));
    this.setQuota(this.quotaService.getOrgQuota(orgId));
    this.setAvailableQuotas(this.quotaService.getOrgAvailableQuota());
    this.setOrgDomains(this.domainService.getDomainList(orgId));
    this.setOrgUserRoles(this.orgUserRoleService.getUserRoles(orgId));
  }

  ngAfterViewChecked(): void {
    if (this.quota.valid && this.availableQuotas.length > 0 && this.exactlyQuotaIndex === null) {
      this.exactlyQuotaIndex =
        this.availableQuotas.findIndex(
          orgQuota => (orgQuota === this.quota) || (orgQuota.guid === this.quota.guid));

      if (this.exactlyQuotaIndex !== -1) {
        const elements = $('#radio-' + this.org.name + '-' + this.quota.name);
        const valid = elements.length > 0 && elements[0] !== undefined && elements[0].tagName === 'INPUT';
        if (valid) {
          elements[0].checked = 'checked';
          this.logger.debug("Select input : ", elements[0]);
        }
      }
    }

    let complete: boolean = this.quota.valid
      && this.availableQuotas.length > 0
      && this.exactlyQuotaIndex !== null && this.exactlyQuotaIndex !== -1
      && this.userRoles.length > 0;

    if (complete && this.common.isLoading) {
      const filterUserRoles = this.userRoles.filter(userRole => { return userRole.userEmail === this.common.getUserEmail()});
      if (filterUserRoles.length <= 0) {
        this.isOrgManagerLoginnedInUser = false;;
      } else {
        this.isOrgManagerLoginnedInUser = (filterUserRoles[0] as OrgUserRole).isOrgManager;
      }
      this.common.isLoading = false;
    }
  }


  renameOrg() {
    this.orgService.renameOrg(this.org, this.wantedOrgName);
  }

  deleteOrg() {
    this.orgService.deleteOrg(this.org);
    this.org = null;
  }

  get spaces() {
    return this.org.spaces;
  }

  private setSpaces(spacesParam: Array<Space>) {
    if (spacesParam === null || spacesParam === undefined) {
      this.org.spaces = [];
    } else {
      this.org.spaces = spacesParam.sort(Space.compareTo);
    }
  }

  resetNewSpaceName() {
    this.createSpaceName = "";
  }

  createSpace($event?) {
    if (this.createSpaceName !== null && this.createSpaceName !== "")
      this.spaceService.createSpace(this.spaces, this.org.guid, this.createSpaceName);

    if ($event !== null && $event !== undefined) {
      $('#layerpop5-' + this.org.name).modal('hide');
    }
  }

  renameSpace($event, space: Space) {
    // the value of input element (#wtc-{space.guid})
    const inputElem = $('#wtc-' + space.guid)[0];
    const wantedToChangeName = inputElem.value;
    this.logger.debug('This space\'s current name is', space.name, '(', space, ')');
    this.logger.debug('This space\'s name will change [', wantedToChangeName, ']');
    this.spaceService.renameSpace(space, wantedToChangeName);
    this.fadeOutButtonSwitch($event);
    inputElem.value = '';  // reset value to change name
  }

  deleteSpace(doDelete: boolean) {
    if (doDelete) {
      this.logger.warn('Delete space : ', this.selectSpace.name);
      this.logger.warn('Remain space : ', this.spaces);
      this.spaceService.deleteSpace(this.spaces, this.selectSpace, true);
    } else {
      this.logger.warn('Cancel to delete space : ', this.selectSpace.name);
    }
    //this.selectSpace = null;
    this.selectSpace = Space.empty();
  }

  get quota() {
    return this.org.quota;
  }

  private setQuota(quotaParam: OrgQuota) {
    this.org.quota = quotaParam;
  }

  get availableQuotas() {
    return this._availableQuotas;
  }

  private setAvailableQuotas(availableQuotasParam: Array<OrgQuota>) {
    if (availableQuotasParam === null || availableQuotasParam === undefined) {
      this._availableQuotas = [];
    } else {
      this._availableQuotas = availableQuotasParam.sort((quotaA, quotaB) => {
        const nameA = quotaA.name;
        const nameB = quotaB.name;
        if (nameA === nameB && nameA === 'default') {
          return 0;
        } else if (nameA === 'default') {
          return -1;
        } else if (nameB === 'default') {
          return 1;
        }

        if (nameA === nameB) {
          return 0;
        } else if (nameA < nameB) {
          return -1;
        } else {
          return 1;
        }
      });
    }
  }

  get domains() {
    return this._domains;
  }

  private setOrgDomains(domainsParam: Array<Domain>) {
    if (domainsParam === null || domainsParam === undefined) {
      this._domains = [];
    } else {
      this._domains = domainsParam;
    }
  }

  get userRoles() {
    return this._orgUserRoles;
  }

  private setOrgUserRoles(userRolesParam: Array<OrgUserRole>) {
    if (userRolesParam === null || userRolesParam === undefined) {
      this._orgUserRoles = [];
    } else {
      this._orgUserRoles = userRolesParam;
    }
  }

  isSelectedQuota(quota: OrgQuota) {
    if (this.quota !== null)
      return this.quota.name === quota.name;
    else
      return false;
  }

  changeQuota(doChange: boolean) {
    if (doChange) {
      this.common.isLoading = true;
      let response = this.quotaService.changeQuota(this.org.guid, this.selectQuota);
      response.then(quotaResult => {
        this.exactlyQuotaIndex = this.availableQuotas.findIndex(quota => quota.guid === quotaResult.guid);
        this.setQuota(quotaResult);

        this.logger.debug('Change quota of org : ', quotaResult.name);
        this.logger.debug('Change currentQuotaIndex(quotaResult) : ', this.exactlyQuotaIndex);
      });
    } else {
      this.cancelChangeQuota();
      this.logger.debug('Cancel to change quota of org : ', this.selectQuota.name);
    }
    this.selectQuota = OrgQuota.empty();
  }

  get isOrgManagerLoginnedInUser() {
    return this._isOrgManager;
  }

  set isOrgManagerLoginnedInUser(extIsOrgManager: boolean) {
    this._isOrgManager = extIsOrgManager;
  }

  isMember(userRole: OrgUserRole) {
    // TODO isMember
    return true;
  }

  isInvited(userRole: OrgUserRole) {
    // TODO isInvited
    return true;
  }

  changeUserRole($event, userRole: OrgUserRole, role: string) {
    this.logger.info('? -> ', $event.target.checked);
    const isChecked = $event.target.checked;
    if (isChecked) {
      const result = this.orgUserRoleService.associateOrgUserRole(userRole, role);
      this.logger.debug('Associate ' + userRole.userEmail + '|role#' + role + ' / result :', result);
      if (!result)
        $event.target.checked = !isChecked;
    } else {
      const result = this.orgUserRoleService.removeOrgUserRole(userRole, role);
      this.logger.debug('Remove ' + userRole.userEmail + '|role#' + role + ' / result :', result);
      if (!result)
        $event.target.checked = !isChecked;
    }
  }

  selectToCancelMemberUser(userRole: OrgUserRole) {
    // TODO selectToCancelMemberUser
    this.selectUserRole = userRole;
  }

  selectToInviteUser(userRole: OrgUserRole) {
    // TODO selectToInviteUser
    this.selectUserRole = userRole;
  }

  selectToCancelInvitionUser(userRole: OrgUserRole) {
    // TODO selectToCancelInvitionUser
    this.selectUserRole = userRole;
  }

  private isValid(param): boolean {
    if (param === null || param === undefined) {
      return false;
    } else {
      return true;
    }
  }

  displayRenameSpace($event) {
    /*
    // origin
    $("th .fa-edit,.table_edit .fa-edit").on("click", function () {
      $("body > div").addClass('account_modify');
      $(this).toggleClass("on");
      $(this).parents("tr").next("tr").toggleClass("on");
      $(this).parents("tr").addClass("off");
    });
    */
    if ($event != null) {
      const element = $event.srcElement;
      $("body > div").addClass('account_modify');
      $(element).toggleClass("on");
      $(element).parents("tr").next("tr").toggleClass("on");
      $(element).parents("tr").addClass("off");
    }
  }

  fadeOutButtonSwitch($event) {
    /*
    // origin
    $(".btns_sw").on("click", function () {
      $(this).parents("tr").prev("tr").removeClass("off");
      $(this).parents("tr").prev("tr").find("i").toggleClass("on");
      $(this).parents("tr").toggleClass("on");
    });
    */
    if ($event !== null) {
      const element = $event.srcElement;
      $(element).parents("tr").prev("tr").removeClass("off");
      $(element).parents("tr").prev("tr").find("i").toggleClass("on");
      $(element).parents("tr").toggleClass("on");
    }
  }

  displayDeleteSpace($event, space: Space) {
    // event
    this.selectSpace = space;
    this.logger.debug('Selected space to delete is ', this.selectSpace.name, ' : ', this.selectSpace);
  }

  displayChangeQuota($event, quota: OrgQuota) {
    this.selectQuota = quota;
    this.logger.debug('Selected quota to change is ', this.selectQuota.name, ' : ', this.selectQuota);
  }

  cancelChangeQuota() {
    $('input[name=radio-' + this.org.name + ']').each((idx, element) => element.checked = '');
  }

  reloadSpaces() {
    this.common.isLoading = true;
    this.setSpaces(this.spaceService.getOrgSpaceList(this.org.guid, () => {
      this.common.isLoading = false;
    }));
  }
}
