import { MemberInsert } from 'ninsho-base'
import { initializeLocalPlugin } from './x-service'

const { pool, plugin } = initializeLocalPlugin()

describe('es-create', () => {

  const user = {
    name: 'test_user',
    mail: 'test@localhost_com',
    pass: 'test1234',
    ip: '127.0.0.1',
    sessionDevice: 'test-client',
    view_name: 'is test view',
    tel: '000-0000-0001'
  }

  type MCustomT = Partial<{
    view_name: string,
    tel: string
  }>

  it('200: Positive case', async () => {
    const res1 = await plugin.createUser<MCustomT>(
      user.name,
      user.mail,
      user.pass,
      user.ip,
      user.sessionDevice,
      {
        view_name: user.view_name,
        tel: user.tel
      }
    )
    if (res1.fail()) throw 1
    // expect
    expect(res1.statusCode).toEqual(201)
    // expect
    const db = await pool.selectOneOrThrow<MemberInsert>('members', '*', { m_name: user.name }, 'AND')
    if (db.fail()) throw 2
    expect(db.response.m_name).toEqual(user.name)
    // expect
    const diff_created_at = new Date().getTime() - (new Date(db.response.created_at)).getTime()
    expect(diff_created_at < 2222).toEqual(true)
    const diff_updated_at = new Date().getTime() - (new Date(db.response.updated_at)).getTime()
    expect(diff_updated_at < 2222).toEqual(true)
  })

  it('200: options', async () => {
    const res1 = await plugin.createUser<MCustomT>(
      user.name,
      user.mail,
      user.pass,
      user.ip,
      user.sessionDevice,
      {
        view_name: user.view_name,
        tel: user.tel
      },
      {
        userAgent: '',
        role: 0,
        unconfirmedDataExpiryThresholdSec: 86400
      }
    )
    if (res1.fail()) throw 1
    // expect
    expect(res1.statusCode).toEqual(201)
    // expect
    const db = await pool.selectOneOrThrow<MemberInsert>('members', '*', { m_name: user.name }, 'AND')
    if (db.fail()) throw 2
    expect(db.response.m_name).toEqual(user.name)
    // expect
    const diff = new Date().getTime() - (new Date(db.response.created_at)).getTime()
    expect(diff < 2222).toEqual(true)
  })

  it('409: conflict', async () => {
    const res1 = await plugin.createUser<MCustomT>(
      user.name,
      user.mail,
      user.pass,
      user.ip,
      user.sessionDevice,
      {
        view_name: user.view_name,
        tel: user.tel
      }
    )
    if (res1.fail()) throw 1

    const res2 = await plugin.createUser<MCustomT>(
      user.name,
      user.mail,
      user.pass,
      user.ip,
      user.sessionDevice,
      {
        view_name: user.view_name,
        tel: user.tel
      }
    )
    if (res1.fail()) throw 1
    expect(res2.statusCode).toEqual(409)
  })

})
