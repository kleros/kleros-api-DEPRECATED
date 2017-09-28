import Kleros from './kleros'
import Web3 from 'web3'
import contract from 'truffle-contract'
import config from '../config'

let court

beforeAll(async () => {
  // use testRPC
  const provider = await new Web3.providers.HttpProvider('http://localhost:8545')

  let KlerosInstance = await new Kleros(provider)

  court = await KlerosInstance.court
})

describe('Kleros', () => {
  test('get disputes', async () => {
    const disputes = [
      {
        title: 'Unknown website owner',
        category: 'Category',
        deadline: '28/8/2017',
        caseId: '#135345',
        status: 'Vote',
        evidence: ''
      },
      {
        title: 'Uncomplete software product',
        category: 'Web, Ecommerce',
        deadline: '28/8/2017',
        caseId: '#135345',
        status: 'Opportunity to appeal',
        evidence: ''
      },
      {
        title: 'Unknown website owner',
        category: 'Web, Ecommerce',
        deadline: '10/9/2017',
        caseId: '#2345',
        status: 'Execution',
        evidence: ''
      },
      {
        title: 'Stolen logo',
        category: 'Category',
        deadline: '28/8/2017',
        caseId: '#135345',
        status: 'Execution',
        evidence: ''
      },
      {
        title: 'Unknown website owner',
        category: 'Category',
        deadline: '28/8/2017',
        caseId: '#135345',
        status: 'Vote',
        evidence: ''
      },
      {
        title: 'Stolen logo',
        category: 'Category',
        deadline: '28/8/2017',
        caseId: '#135345',
        status: 'Vote',
        evidence: ''
      },
      {
        title: 'Stolen logo',
        category: 'Category',
        deadline: '28/8/2017',
        caseId: '#135345',
        status: 'Vote',
        evidence: ''
      }
    ]

    let disputesKleros = await court.getDisputes()

    expect(disputes).toEqual(disputesKleros);
  })
})
