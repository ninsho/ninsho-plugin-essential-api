import { defaultOptions } from 'ninsho-base'
import ModPg from 'ninsho-module-pg'
import ModSecure from 'ninsho-module-secure'

import util from 'util'
export const log = (...args: any[]) => {
  process.stdout.write(util.format(...args) + '\n')
}

import { EssentialAPI } from '../plugin-essential-api'

jest.setTimeout(8000)

/**
 * initializeLocalPlugin
 * @returns {plugin, pool}
 */
export function initializeLocalPlugin() {

  // read pool and secure
  const pool = ModPg.init(
    {
      user: 'postgres',
      host: 'localhost',
      database: 'postgres',
      password: 'postgres',
      port: 5432,
      forceRelease: true
    }
  ).setOptions(defaultOptions)

  const plugin = EssentialAPI.init().setModules(
    {
      options: defaultOptions,
      pool: pool,
      secure: ModSecure.init({ secretKey: 'Abracadabra' })
    }
  )

  beforeEach(async function() {
    await pool.truncate(['members', 'sessions'])
    log(expect.getState().currentTestName)
  })

  return {
    plugin,
    pool
  }
}
