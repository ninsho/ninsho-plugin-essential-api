import { ModuleBase, ModulesStoreType, PluginBase, IOptions } from 'ninsho-base'
import { DeepPartial, mergeDeep } from 'ninsho-utils'
import { CreateUser } from './feat-create'
import { DeleteUser } from './feat-delete'
import { LoginUser } from './feat-login'

// - Code required for each plugin -
const pluginName = 'EssentialAPI' // plugin Name
const dependencyModules = ['pool', 'secure'] as const // Required Modules Name

// - boiler template - Specify types only for the modules being used.
export type LendOfHere = {
  options: IOptions,
  modules: Pick<ModulesStoreType, typeof dependencyModules[number]>,
}

export type EssentialAPIConfig = {
  unconfirmedDataExpiryDefaultThresholdSec: number
}

const defaultConfig: EssentialAPIConfig = {
  unconfirmedDataExpiryDefaultThresholdSec: 86400
}

export class EssentialAPI extends PluginBase {

  // - boiler template - 
  readonly pluginName = pluginName

  // - boiler template - store modules
  setModules(
    modules: { [keys: string]: ModuleBase | IOptions }
  ): Omit<this, 'pluginName' | 'config' | 'setModules'> {
    this.storeModules(modules, pluginName, dependencyModules)
    return this
  }

  // - plugin specific options -
  config = {} as EssentialAPIConfig
  static init(options: DeepPartial<EssentialAPIConfig> = {}) {
    const instance = new this()
    instance.config = mergeDeep(defaultConfig, options) as EssentialAPIConfig
    return instance
  }

  createUser = CreateUser.init(this.lend, this.config)
  deleteUser = DeleteUser.init(this.lend, this.config)
  loginUser = LoginUser.init(this.lend, this.config)
}
