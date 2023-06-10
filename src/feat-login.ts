import { MRole, MStatus, MemberInsert, SessionInsert } from 'ninsho-base'
import { ApiSuccess, E400, E401, E403, E404, E500, IApiResult } from 'ninsho-base'
import { calibrationOfColumnsForMembers } from 'ninsho-utils'
import { upsertSessionRowWithReturnedSessionToken } from './service-data'
import { EssentialAPIConfig, LendOfHere } from './plugin-essential-api'

export class LoginUser {

  // - boiler plate -
  lend = {} as LendOfHere
  config = {} as EssentialAPIConfig
  static init(lend: LendOfHere, config: EssentialAPIConfig) {
    const instance = new this()
    instance.lend = lend
    instance.config = config
    return instance.method
  }

  private async method(
    name: string | undefined | null,
    mail: string | undefined | null,
    pass: string,
    ip: string,
    sessionDevice: string,
    options?: {
      rolePermissionLevel?: number,
      userAgent?: string,
      forceAllLogout?: boolean,
      columnToRetrieve?: (keyof MemberInsert)[] | '*',
    }
  ): Promise<IApiResult<{
    session_token: string
  }, void, E500 | E400 | E401 | E403 | E404>> {

    const lend = this.lend
    const req = {
      name: name || undefined,
      mail: mail || undefined,
      pass,
      ip,
      sessionDevice,
      options: {
        userAgent: options?.userAgent ?? '',
        rolePermissionLevel: options?.rolePermissionLevel ?? MRole.User,
        forceAllLogout: options?.forceAllLogout === false ? false : true,
        columnToRetrieve: calibrationOfColumnsForMembers(options?.columnToRetrieve, [
          'id',
          'm_role',
          'm_status',
          'm_name',
          'm_pass'
        ])
      }
    }

    const others = { passwordChecked: false }

    const conditionSet: { m_name?: string, m_mail?: string } = {}
    if (req.name) conditionSet.m_name = req.name
    if (req.mail) conditionSet.m_mail = req.mail
    if (!Object.keys(conditionSet).length) return new E400(2110)

    const sel = await lend.modules.pool.selectOneOrThrow<MemberInsert>(
      lend.options.tableName.members,
      req.options.columnToRetrieve,
      conditionSet, 'AND'
    )
    if (sel.fail()) return sel.pushReplyCode(2111)
    if (sel.response.m_role < req.options.rolePermissionLevel) return new E403(2112)
    if (sel.response.m_status != MStatus.ACTIVE) return new E401(2113)

    if (!others.passwordChecked && !lend.modules.secure.checkHashPassword(req.pass, sel.response.m_pass))
      return new E401(2114)

    const connection = await lend.modules.pool.beginWithClient()

    // force all signOut
    if (req.options.forceAllLogout) {
      const del = await lend.modules.pool.delete<SessionInsert>(
        { m_name: req.name },
        lend.options.tableName.sessions,
        connection
      )
      /* istanbul ignore if */
      if (del.fail()) {
        await lend.modules.pool.rollbackWithRelease(connection)
        return del.pushReplyCode(2115)
      }
    }

    const resUpsert = await upsertSessionRowWithReturnedSessionToken (
      lend,
      sel.response.id,
      sel.response.m_role,
      sel.response.m_name,
      req.ip,
      req.sessionDevice,
      connection
    )
    /* istanbul ignore if */
    if (resUpsert.fail()) return resUpsert.pushReplyCode(2116)

    await lend.modules.pool.commitWithRelease(connection)

    return new ApiSuccess(
      200,
      {
        session_token: resUpsert.response.sessionToken
      }
    )

  }
}
