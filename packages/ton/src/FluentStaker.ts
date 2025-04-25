type AsyncStep = () => Promise<void>

/*
 * FluentStaker simplifies the process of creating, signing, and broadcasting by
 * method chaining.
 *
 * Example usage:
 * const result = await new FluentStaker(StakerClass, { ... })
 *  .buildStakeTx({ ... })
 *  .sign({ ... })
 *  .broadcast({ ... })
 *  .exec();
 *
 *  In addition you can call .staker() to get the underlying staker instance
 */
export class FluentStaker<Inst extends object> {
  instance: Inst
  queue: AsyncStep[] = []
  lastResult!: any
  unsignedTx!: any
  signedTx!: any
  initPromise: Promise<void>

  constructor (StakerClass: new (...args: any[]) => Inst, ...ctorArgs: ConstructorParameters<typeof StakerClass>) {
    // setup staker class instance
    this.instance = new StakerClass(...ctorArgs)
    this.initPromise = (this.instance as any).init ? (this.instance as any).init() : Promise.resolve()

    // return our Proxy to handle all chaining
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        const inst = target.instance as any
        const name = prop.toString()

        // allow build*() methods
        if (name.startsWith('build') && typeof inst[name] === 'function') {
          return (...args: any[]) => {
            target.queue.push(async () => {
              target.lastResult = await inst[name](...args)
              target.unsignedTx = target.lastResult.tx
            })
            return receiver
          }
        }

        // allow sign() method
        if (name === 'sign' && typeof inst[name] === 'function') {
          return (opts: any) => {
            target.queue.push(async () => {
              if (target.unsignedTx === undefined) {
                throw new Error('No unsigned transaction found. Please call a build method first')
              }

              target.lastResult = await inst.sign({ ...opts, tx: target.unsignedTx })
              target.signedTx = target.lastResult
            })
            return receiver
          }
        }

        // allow broadcast() method
        if (name === 'broadcast' && typeof inst[name] === 'function') {
          return (opts: any) => {
            target.queue.push(async () => {
              if (target.signedTx === undefined) {
                throw new Error('No signed transaction found. Please call sign() first')
              }
              target.lastResult = await inst.broadcast({ ...opts, signedTx: target.signedTx })
            })
            return receiver
          }
        }

        // exec() method to run all queued steps
        if (name === 'exec') {
          return async () => {
            // initialize staker class instance
            await target.initPromise
            // then run build/sign/broadcast steps
            for (const step of target.queue) await step()

            // clear the queue
            target.queue = []

            // return the result to the caller
            return target.lastResult
          }
        }

        // staker() method to return the underlying instance
        if (name === 'staker') {
          return () => {
            return target.instance
          }
        }

        throw new Error(`Method ${name} not found. Please call build*(), sign() or broadcast() methods only.`)
      }
    })
  }
}

// helper to auto-make these Easy classes
export function makeEasyStaker<SC extends new (...args: any[]) => any> (StakerClass: SC) {
  type Inst = InstanceType<SC>
  return class EasyStaker extends FluentStaker<Inst> {
    constructor (...args: ConstructorParameters<typeof StakerClass>) {
      super(StakerClass, ...args)
    }
  }
}
