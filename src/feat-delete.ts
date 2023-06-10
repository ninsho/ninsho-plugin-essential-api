import { MRole, MStatus, MemberInsert, MembersCol, SessionCol, SessionInsert } from 'ninsho-base'
import { ApiSuccess, E400, E401, E403, E404, E500, IApiResult } from 'ninsho-base'
import { getNowUnixTime, calibrationOfColumnsForMix } from 'ninsho-utils'
import { EssentialAPIConfig, LendOfHere } from './plugin-essential-api'

export class DeleteUser {

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
    sessionToken: string,
    ip: string,
    sessionDevice: string,
    options?: {
      pass?: string,
      physical_deletion?: boolean,
      overwritePossibleOnLogicallyDeletedData?: boolean,
      rolePermissionLevel?: number,
      userAgent?: string,
      columnToRetrieve?: (MembersCol | SessionCol)[] | '*',
    }
  ): Promise<IApiResult<null, void, E400 | E401 | E403 | E404 | E500>> {

    const others = { passwordChecked: false }
    const lend = this.lend
    const req = {
      sessionToken,
      ip,
      sessionDevice,
      options: {
        pass: options?.pass, // Ninsho checks passwords only when there is a password
        physical_deletion: options?.physical_deletion === false ? false : true,
        overwritePossibleOnLogicallyDeletedData: options?.overwritePossibleOnLogicallyDeletedData === false ? false : true,
        rolePermissionLevel: options?.rolePermissionLevel ?? MRole.User,
        userAgent: options?.userAgent || '',
        columnToRetrieve: calibrationOfColumnsForMix(options?.columnToRetrieve, [
          'members.m_custom',
          'members.m_name',
          'members.m_mail',
          'members.m_pass',
          'members.m_role',
          'members.m_status',
          'members.version'
        ])
      },
    }

    // Inspect Session

    const session = await lend.modules.pool.retrieveMemberIfSessionPresentOne<MemberInsert & SessionInsert>(
      lend.modules.secure.toHashForSessionToken(req.sessionToken),
      getNowUnixTime() - lend.options.sessionExpirationSec,
      req.sessionDevice,
      req.ip,
      req.options.columnToRetrieve
    )
    if (session.fail()) return session.pushReplyCode(2102)
    if (session.response.m_role < req.options.rolePermissionLevel) return new E403(2103)
    if (session.response.m_status != MStatus.ACTIVE) return new E401(2104)

    if (req.options.pass
      && !others.passwordChecked
      && !lend.modules.secure.checkHashPassword(req.options.pass, session.response.m_pass))
      return new E401(2105)

    const connection = await lend.modules.pool.beginWithClient()

    // Logout all

    const delSessions = await lend.modules.pool.deleteOrThrow<SessionInsert>(
      {
        m_name: session.response.m_name
      },
      lend.options.tableName.sessions,
      connection)
    /* istanbul ignore if */
    if (delSessions.fail()) {
      await lend.modules.pool.rollbackWithRelease(connection)
      return delSessions.pushReplyCode(2106)
    }

    // delete user

    if (req.options.physical_deletion) {
      const delMember = await lend.modules.pool.deleteOrThrow<MemberInsert>(
        {
          m_name: session.response.m_name
        },
        lend.options.tableName.members,
        connection)
      /* istanbul ignore if */
      if (delMember.fail()) {
        await lend.modules.pool.rollbackWithRelease(connection)
        return delMember.pushReplyCode(2107)
      }
    } else {
      const tmpDate = new Date().getTime()
      const updMember = await lend.modules.pool.updateOneOrThrow<MemberInsert>(
        {
          m_status: MStatus.INACTIVE,
          m_name: req.options.overwritePossibleOnLogicallyDeletedData ? `${tmpDate}#${session.response.m_name}` : session.response.m_name,
          m_mail: req.options.overwritePossibleOnLogicallyDeletedData ? `${tmpDate}#${session.response.m_mail}` : session.response.m_mail,
        },
        {
          m_name: session.response.m_name,
          m_status: MStatus.ACTIVE
        },
        'AND',
        lend.options.tableName.members,
        connection)
      /* istanbul ignore if */
      if (updMember.fail()) {
        await lend.modules.pool.rollbackWithRelease(connection)
        return updMember.pushReplyCode(2108)
      }
    }

    await lend.modules.pool.commitWithRelease(connection)

    return new ApiSuccess(
      204,
      null
    )
  }
}
