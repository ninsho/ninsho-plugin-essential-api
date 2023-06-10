import { MRole, MStatus, MemberInsert, SessionInsert, ApiSuccess, E409, E500, IApiResult } from 'ninsho-base'
import { getNowUnixTime } from 'ninsho-utils'
import { EssentialAPIConfig, LendOfHere } from './plugin-essential-api'

export class CreateUser {

  // - boiler plate -
  lend = {} as LendOfHere
  config = {} as EssentialAPIConfig
  static init(lend: LendOfHere, config: EssentialAPIConfig) {
    const instance = new this()
    instance.lend = lend
    instance.config = config
    return instance.method
  }

  private async method<MCustom>(
    name: string,
    mail: string,
    pass: string,
    ip: string,
    sessionDevice: string,
    m_custom: MCustom,
    options?: {
      role?: number,
      userAgent?: string,
      unconfirmedDataExpiryThresholdSec?: number
    }
  ): Promise<IApiResult<{
    session_token: string
  }, void, E500 | E409>> {

    const lend = this.lend
    const req = {
      name,
      mail,
      pass,
      ip,
      sessionDevice,
      m_custom,
      options: {
        userAgent: options?.userAgent || '',
        role: options?.role ?? MRole.User,
        unconfirmedDataExpiryThresholdSec: options?.unconfirmedDataExpiryThresholdSec
          ?? this.config.unconfirmedDataExpiryDefaultThresholdSec
      }
    }

    const connection = await lend.modules.pool.beginWithClient()

    const ins = await lend.modules.pool.replaceOneWithConditionExistAndDeadLine<MemberInsert>(
      {
        m_name: req.name,
        m_pass: lend.modules.secure.toHashForPassword(req.pass),
        m_mail: req.mail,
        m_custom: req.m_custom,
        m_role: req.options.role,
        m_ip: req.ip,
        otp_hash: null,
        m_status: MStatus.ACTIVE
      },
      lend.options.tableName.members,
      req.options.unconfirmedDataExpiryThresholdSec,
      connection)
    if (ins.fail()) {
      await lend.modules.pool.rollbackWithRelease(connection)
      return ins.pushReplyCode(2100)
    }

    const { sessionToken, hashToken } = lend.modules.secure.createSessionTokenWithHash()

    const insSession = await lend.modules.pool.insertOne<SessionInsert>(
      {
        members_id: ins.response.rows[0].id,
        m_name: req.name,
        m_ip: req.ip,
        m_device: req.sessionDevice,
        created_time: getNowUnixTime(),
        token: hashToken,
        m_role: req.options.role,
      },
      lend.options.tableName.sessions,
      connection)
    /* istanbul ignore if */
    if (insSession.fail()) {
      await lend.modules.pool.rollbackWithRelease(connection)
      return insSession.pushReplyCode(2101)
    }

    await lend.modules.pool.commitWithRelease(connection)

    return new ApiSuccess(
      201,
      {
        session_token: sessionToken
      }
    )
  }
}
