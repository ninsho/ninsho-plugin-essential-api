import { MStatus, MemberInsert } from 'ninsho-base'
import { initializeLocalPlugin } from './x-service'

const { pool, plugin } = initializeLocalPlugin()

describe('es-delete', () => {

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
    if (res.fail()) throw 100
    return res
  }

  it('204: Positive case', async () => {
    const res1_create = await create()
    // delete
    const res2_delete = await plugin.deleteUser(
      res1_create.body.session_token,
      user.ip,
      user.sessionDevice
    )
    if (res2_delete.fail()) throw 1
    expect(res2_delete.statusCode).toEqual(204)
  })

  it('204: good password', async () => {
    const res1_create = await create()
    // delete
    const res2_delete = await plugin.deleteUser(
      res1_create.body.session_token,
      user.ip,
      user.sessionDevice, {
        pass: 'test1234'
      }
    )
    if (res2_delete.fail()) throw 1
    expect(res2_delete.statusCode).toEqual(204)
  })

  it('401: bad password', async () => {
    const res1_create = await create()
    // delete
    const res2_delete = await plugin.deleteUser(
      res1_create.body.session_token,
      user.ip,
      user.sessionDevice, {
        pass: 'XXX'
      }
    )
    if (!!!res2_delete.fail()) throw 1
    expect(res2_delete.statusCode).toEqual(401)
  })

  it('204: physical_deletion: false', async () => {
    const res1_create = await create()
    // delete
    const res2_delete = await plugin.deleteUser(
      res1_create.body.session_token,
      user.ip,
      user.sessionDevice,
      {
        physical_deletion: false
      }
    )
    if (res2_delete.fail()) throw 1
    // expect
    expect(res2_delete.statusCode).toEqual(204)
    // expect
    const db = await pool.selectOneOrThrow<MemberInsert>('members', '*', { m_status: MStatus.INACTIVE }, 'AND')
    if (db.fail()) throw 2
    expect(!!db.response?.m_name.match(new RegExp('^\\d+#' + user.name + '$'))).toEqual(true)
    // expect
    const diff_updated_at = new Date().getTime() - (new Date(db.response.updated_at)).getTime()
    expect(diff_updated_at < 500).toEqual(true)
  })

  it('409: overwritePossibleOnLogicallyDeletedData: false', async () => {
    const res1_create = await create()
    // delete
    const res2_delete = await plugin.deleteUser(
      res1_create.body.session_token,
      user.ip,
      user.sessionDevice, {
        physical_deletion: false,
        overwritePossibleOnLogicallyDeletedData: false
      }
    )
    if (res2_delete.fail()) throw 1
    expect(res2_delete.statusCode).toEqual(204)
    //
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
    if (!!!res.fail()) throw 100
    expect(res.statusCode).toEqual(409)
  })

  it('204: role', async () => {
    const res1_create = await create()
    // delete
    const res2_delete = await plugin.deleteUser(
      res1_create.body.session_token,
      user.ip,
      user.sessionDevice, {
        rolePermissionLevel: 1
      }
    )
    if (!!!res2_delete.fail()) throw 1
    expect(res2_delete.statusCode).toEqual(403)
  })

  it('401: no session', async () => {
    const res1_create = await create()
    // delete
    const res2_delete = await plugin.deleteUser(
      res1_create.body.session_token + 'XXX',
      user.ip,
      user.sessionDevice
    )
    if (!!!res2_delete.fail()) throw 1
    expect(res2_delete.statusCode).toEqual(401)
  })

  it('404: status', async () => {
    const res1_create = await create()
    // brake
    const db = await pool.updateOneOrThrow<MemberInsert>(
      { m_status: 9 }, { m_name: user.name }, 'AND', 'members')
    if (db.fail()) throw 1
    // delete
    const res2_delete = await plugin.deleteUser(
      res1_create.body.session_token,
      user.ip,
      user.sessionDevice
    )
    if (!!!res2_delete.fail()) throw 2
    expect(res2_delete.statusCode).toEqual(401)
  })

})
