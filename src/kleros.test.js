import Kleros from './Kleros'
import Web3 from 'web3'
import contract from 'truffle-contract'
import {LOCALHOST_PROVIDER} from '../constants'
import config from '../config'


describe('Kleros', () => {
  let court
  let centralCourt
  let arbitrableTransaction

  beforeAll(async () => {
    // use testRPC
    const provider = await new Web3.providers.HttpProvider(LOCALHOST_PROVIDER)

    let KlerosInstance = await new Kleros(provider)

    court = await KlerosInstance.court
    centralCourt = await KlerosInstance.centralCourt
    arbitrableTransaction = await KlerosInstance.arbitrableTransaction
  })

  test('deploy a arbitrableTransaction contract', async () => {
    let centralCourtDeployed = await centralCourt.deploy()
    expect(centralCourtDeployed.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash


    let contractArbitrableTransactionAddress = await arbitrableTransaction.deploy(
      undefined, // use default account : account[0]
      undefined, // use default value : 0
      centralCourtDeployed.address
    )
    expect(contractArbitrableTransactionAddress.transactionHash)
      .toEqual(expect.stringMatching(/^0x[a-f0-9]{64}$/)) // tx hash
  })

  test('get disputes', async () => {
    const disputes = [
      {
        title: 'Unknown website owner',
        category: 'Category',
        deadline: '28/8/2017',
        caseId: '#1',
        status: 'Vote',
        evidence: ''
      },
      {
        title: 'Uncomplete software product',
        category: 'Web, Ecommerce',
        deadline: '28/8/2017',
        caseId: '#2',
        status: 'Opportunity to appeal',
        evidence: ''
      },
      {
        title: 'Unknown website owner',
        category: 'Web, Ecommerce',
        deadline: '10/9/2017',
        caseId: '#3',
        status: 'Execution',
        evidence: ''
      },
      {
        title: 'Stolen logo',
        category: 'Category',
        deadline: '28/8/2017',
        caseId: '#4',
        status: 'Execution',
        evidence: ''
      },
      {
        title: 'Unknown website owner',
        category: 'Category',
        deadline: '28/8/2017',
        caseId: '#5',
        status: 'Vote',
        evidence: ''
      },
      {
        title: 'Stolen logo',
        category: 'Category',
        deadline: '28/8/2017',
        caseId: '#6',
        status: 'Vote',
        evidence: ''
      },
      {
        title: 'Stolen logo',
        category: 'Category',
        deadline: '28/8/2017',
        caseId: '#7',
        status: 'Vote',
        evidence: ''
      }
    ]

    let disputesKleros = await court.getDisputes()

    expect(disputes).toEqual(disputesKleros);
  })
})
