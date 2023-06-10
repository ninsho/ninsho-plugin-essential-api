import { MemberInsert } from 'ninsho-base'
import { initializeLocalPlugin, log } from './x-service'

const { pool, plugin } = initializeLocalPlugin()

describe('es-login', () => {

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

  const create = async () => {
    const res = await plugin.createUser<MCustomT>(
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
    if (res.fail()) { log(res.body); throw 100 }
    return res
  }

  it('200: Positive case', async () => {
    const res1_create = await create()
    // test
    const res1 = await plugin.loginUser(
      user.name,
      user.mail,
      user.pass,
      user.ip,
      user.sessionDevice
    )
    if (res1.fail()) throw 1
    expect(res1.statusCode).toEqual(200)
  })

  it('200: options pattern', async () => {
    const optionsList: Parameters<typeof plugin.loginUser>[5][] = [
      {
        forceAllLogout: false
      },
      {
        userAgent: 'test-agent',
      }
    ]
    for (let i = 0; i < optionsList.length; i++) {
      // [required]
      await pool.truncate(['members', 'sessions'])
      // data create
      const res1_create = await create()
      // test
      const res1 = await plugin.loginUser(
        user.name,
        user.mail,
        user.pass,
        user.ip,
        user.sessionDevice,
        optionsList[i]
      )
      if (res1.fail()) throw 1
      expect(res1.statusCode).toEqual(200)
    }
  })

  it('400: bad password', async () => {
    const res1_create = await create()
    // test
    const res1 = await plugin.loginUser(
      user.name,
      user.mail,
      user.pass + 'XXX',
      user.ip,
      user.sessionDevice
    )
    if (!!!res1.fail()) { throw 1 }
    expect(res1.statusCode).toEqual(401)
    expect(res1.body.replyCode).toEqual([2114])
  })

  it('400: name/mail nothing', async () => {
    const res1_create = await create()
    // test
    const res1 = await plugin.loginUser(
      '',
      '',
      user.pass,
      user.ip,
      user.sessionDevice
    )
    if (!!!res1.fail()) { throw 1 }
    expect(res1.statusCode).toEqual(400)
  })

  it('403: options.rolePermissionLevel', async () => {
    const res1_create = await create()
    // test
    const res1 = await plugin.loginUser(
      user.name,
      user.mail,
      user.pass,
      user.ip,
      user.sessionDevice,
      {
        rolePermissionLevel: 1
      }
    )
    if (!!!res1.fail()) throw 1
    expect(res1.statusCode).toEqual(403)
  })

  it('401: status', async () => {
    const res1_create = await create()
    // brake
    const db = await pool.updateOneOrThrow<MemberInsert>(
      { m_status: 9 }, { m_name: user.name }, 'AND', 'members')
    if (db.fail()) throw 1
    // test
    const res1 = await plugin.loginUser(
      user.name,
      user.mail,
      user.pass,
      user.ip,
      user.sessionDevice
    )
    if (!!!res1.fail()) throw 2
    expect(res1.statusCode).toEqual(401)
  })

  it('404: no user data', async () => {
    const res1_create = await create()
    // brake
    const db = await pool.updateOneOrThrow<MemberInsert>(
      { m_status: 9 }, { m_name: user.name }, 'AND', 'members')
    if (db.fail()) throw 1
    // test
    const res1 = await plugin.loginUser(
      user.name + 'XXX',
      user.mail + 'XXX',
      user.pass,
      user.ip,
      user.sessionDevice
    )
    if (!!!res1.fail()) throw 2
    expect(res1.statusCode).toEqual(404)
  })

})
