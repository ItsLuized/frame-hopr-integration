import React from 'react'
import Restore from 'react-restore'

import link from '../../../resources/link'
import svg from '../../../resources/svg'

function isHardwareSigner (type = '') {
  return ['ledger', 'trezor', 'lattice'].includes(type.toLowerCase())
}

function isLoading (status = '') {
  const statusToCheck = status.toLowerCase()
  return ['loading', 'connecting', 'addresses', 'input', 'pairing'].some(s => statusToCheck.includes(s))
}

function isDisconnected (type, status, isLoading) {
  if (type === 'lattice') {
    return status !== 'ok' && !isLoading
  }

  if (type === 'trezor') {
    return (status === 'disconnected' || status.includes('reconnect')) && !isLoading
  }
  
  return false
}

class Signer extends React.Component {
  constructor (...args) {
    super(...args)

    this.state = {
      page: 0,
      addressLimit: 5,
      latticePairCode: '',
      tPin: '',
      tPhrase: ''
    }
  }

  backspacePin (e) {
    e.stopPropagation()
    this.setState({ tPin: this.state.tPin ? this.state.tPin.slice(0, -1) : '' })
  }

  trezorPin (num) {
    this.setState({ tPin: this.state.tPin + num.toString() })
  }

  submitPin () {
    link.rpc('trezorPin', this.props.id, this.state.tPin, () => {})
    this.setState({ tPin: '' })
  }

  submitPhrase () {
    this.setState({ tPhrase: '' })
    link.rpc('trezorPhrase', this.props.id, this.state.tPhrase || '', () => {})
  }

  renderLoadingLive () {
    if (this.props.type === 'ledger' && this.getStatus() === 'deriving live addresses') {
      const liveAccountLimit = this.store('main.ledger.liveAccountLimit')
      const styleWidth = liveAccountLimit === 20 ? 120 : liveAccountLimit === 40 ? 120 : 60
      const marginTop = liveAccountLimit === 40 ? -8 : 0
      return (
        <div className='loadingLiveAddresses' style={{ top: `${marginTop}px`, padding: '20px', width: `${styleWidth}px` }}>
          {[...Array(liveAccountLimit).keys()].map(i => i + 1).map(i => {
            return <div key={'loadingLiveAddress' + i} className='loadingLiveAddress' style={{ opacity: i <= this.props.liveAddressesFound ? '1' : '0.3' }} />
          })}
        </div>
      )
    } else {
      return null
    }
  }

  renderTrezorPin (active) {
    return (
      <div className='trezorPinWrap' style={active ? {} : { height: '0px', padding: '0px 0px 0px 0px' }}>
        {active ? (
          <>
            <div className='trezorPhraseInput'>
              {this.state.tPin.split('').map((n, i) => {
                return (
                  <div key={i} className='trezorPinInputButton' onMouseDown={this.trezorPin.bind(this, i)}>
                    {svg.octicon('primitive-dot', { height: 14 })}
                  </div>
                )
              })}
            </div>
            <div className='signerPinMessage signerPinSubmit' onMouseDown={this.state.tPin ? () => this.submitPin() : null}>
              Submit Pin
              {this.state.tPin ? (
                <div className='signerPinDelete' onMouseDown={this.backspacePin.bind(this)}>
                  {svg.octicon('chevron-left', { height: 18 })}
                </div>
              ) : null}
            </div>
            <div className='trezorPinInputWrap'>
              <div className='trezorPinInput'>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                  <div key={i} className='trezorPinInputButton' onMouseDown={this.trezorPin.bind(this, i)}>
                    {svg.octicon('primitive-dot', { height: 20 })}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    )
  }

  phraseKeyPress (e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      this.submitPhrase()
    }
  }

  renderTrezorPhrase (active) {
    const allowsDeviceEntry = (this.props.capabilities || []).includes('Capability_PassphraseEntry')

    return (
      <div className='trezorPinWrap' style={active ? {} : { height: '0px', padding: '0px 0px 0px 0px' }}>
        {active ? (
          <>
            <div className='trezorPhraseInput'>
              <input type='password' onChange={(e) => this.setState({ tPhrase: e.target.value })} onKeyPress={e => this.phraseKeyPress(e)} autoFocus />
            </div>
            <div className='signerPinMessage signerPinSubmit' onMouseDown={evt => {
              if (evt.button === 0) { // left click only
                this.submitPhrase()
              }
            }}>
              Submit Passphrase
            </div>
            {
              allowsDeviceEntry
                ? <>
                    <div className='signerPinMessageOr'>{'or'}</div>
                    <div className='signerPinMessage signerPinSubmit' onMouseDown={evt => {
                      if (evt.button === 0) { // left click only
                        link.rpc('trezorEnterPhrase', this.props.id, () => {})
                      }
                    }}>
                      Enter passphrase on device
                    </div>
                  </>
                : <></>
            }
          </>
        ) : null}
      </div>
    )
  }

  getStatus () {
    return (this.props.status || '').toLowerCase()
  }

  status () {
    const status = this.getStatus()

    if (status === 'ok') {
      return (
        <div className='signerStatus'>
          <div className='signerStatusIndicator signerStatusIndicatorReady'></div>
        </div>
      )
    } else if (status === 'locked') {
      return (
        <div className='signerStatus'>
          <div className='signerStatusIndicator signerStatusIndicatorLocked'></div>
        </div>
      )
    } else {
      return (
        <div className='signerStatus'>
          <div className='signerStatusIndicator'></div>
        </div>
      )
    }
  }

  statusText () {
    const status = this.getStatus()

    if (status === 'ok') {
      return (
        <div className='signerStatusText signerStatusReady'>{'ready to sign'}</div>
      )
    } else if (status === 'locked') {
      const hwSigner = isHardwareSigner(this.props.type)
      const lockText = hwSigner
        ? 'Please unlock your ' + this.props.type
        : 'locked'
      
      const classes = hwSigner 
        ? 'signerStatusText'
        : 'signerStatusText signerStatusIssue'
      return (
        <div className={classes}>{lockText}</div>
      )
    } else if (status === 'addresses') {
      return (
        <div className='signerStatusText'>{'deriving addresses'}</div>
      )
    } else {
      return (
        <div className='signerStatusText'>{this.props.status}</div>
      )
    }
  }

  nextPage (backwards) {
    let page = backwards ? this.state.page - 1 : this.state.page + 1
    const signer = this.store('main.signers', this.props.id)
    const maxPage = Math.ceil(signer.addresses.length / this.state.addressLimit) - 1
    if (page > maxPage) page = maxPage
    if (page < 0) page = 0
    this.setState({ page })
  }

  pairToLattice () {
    link.rpc('latticePair', this.props.id, this.state.latticePairCode, () => {})
    
    this.setState({ latticePairCode: '' })
  }

  reconnectButton (hwSigner) {
    return (
      <div className='signerControlOption'
        onMouseDown={() => {
          link.send('dash:reloadSigner', this.props.id)
        }}
      >
        {hwSigner ? 'Reconnect' : 'Reload Signer'}
      </div>
    )
  }

  render () {
    const signer = this.store('main.signers', this.props.id)
    const { page, addressLimit } = this.state
    const startIndex = page * addressLimit

    const status = this.getStatus()

    const hwSigner = isHardwareSigner(this.props.type)
    const loading = isLoading(status)
    const disconnected = isDisconnected(this.props.type, status, loading)

    // TODO: create well-defined signer states that drive these UI features
    const canReconnect =
      (this.props.type !== 'trezor' || status === 'disconnected' || status.includes('reconnect'))

    // UI changes for this status only apply to hot signers
    const isLocked = !hwSigner && status === 'locked'
    const permissionId = (this.props.tag || this.props.tag === '')
      ? 'Frame' + (this.props.tag ? `-${this.props.tag}` : '')
      : undefined

    let signerClass = 'signer'
    if (status === 'ok') signerClass += ' signerOk'
    if (isLocked) signerClass += ' signerLocked'

    return (
      <div className={signerClass} style={{ zIndex: 1000 - this.props.index }}>
        <div className='signerTop'>
          <div className='signerIcon'>
          {(_ => {
            const type = this.props.type
            if (type === 'ledger') return <div className='signerIconWrap signerIconHardware'>{svg.ledger(20)}</div>
            if (type === 'trezor') return <div className='signerIconWrap signerIconHardware'>{svg.trezor(20)}</div>
            if (type === 'seed' || type === 'ring') return <div className='signerIconWrap signerIconHot'>{svg.flame(23)}</div>
            if (type === 'aragon') return <div className='signerIconWrap signerIconSmart'>{svg.aragon(28)}</div>
            if (type === 'lattice') return <div className='signerIconWrap signerIconSmart'>{svg.lattice(22)}</div>
            return <div className='signerIconWrap'>{svg.logo(20)}</div>
          })()}
          </div>
          <div className='signerType' style={this.props.inSetup ? {top: '21px'} : {top: '24px'}}>{this.props.model}</div>
          <div className='signerName'>
            {this.props.name}
            <div className='signerNameUpdate'>
              {svg.save(14)}
            </div>
          </div>
          {this.status()}
        </div>
        {this.statusText()}
        {this.props.type === 'lattice' && status === 'pair' ? (
          <div className='signerLatticePair'>
            <div className='signerLatticePairTitle'>Please input your Lattice's pairing code</div>
            <div className='signerLatticePairInput'>
              <input
                autoFocus
                tabIndex='1' value={this.state.latticePairCode}
                onChange={e => this.setState({ latticePairCode: (e.target.value || '').toUpperCase() })}
                onKeyPress={e => {
                  if (e.key === 'Enter') this.pairToLattice()
                }}
              />
            </div>
            <div
              onMouseDown={() => this.pairToLattice()}
              className='signerLatticePairSubmit'
            >Pair</div>
          </div>
        ) : status === 'ok' || isLocked ? (
          <>
            {/* <div className='signerAccountsTitle'>
              <span className={activeAccounts.length > 0 ? 'signerAccountsTitleActive signerAccountsTitleActiveOn' : 'signerAccountsTitleActive'}>
                <span>{'active accounts'}</span> 
                <span className='signerAccountsTitleActiveCount'>{activeAccounts.length}</span> 
              </span>
            </div> */}
            <div className='signerAccounts'>{signer.addresses.slice(startIndex, startIndex + addressLimit).map((address, index) => {
              const added = this.store('main.accounts', address.toLowerCase())
              return (
                <div key={address} className={!added ?  'signerAccount' : 'signerAccount signerAccountAdded'} onMouseDown={() => {
                  if (this.store('main.accounts', address.toLowerCase())) {
                    link.rpc('removeAccount', address, {}, () => { })
                  } else {
                    link.rpc('createAccount', address, { type: signer.type }, (e) => {
                      if (e) console.error(e)
                    })
                  }
                }}>
                  <div className='signerAccountIndex'>{index + 1 + startIndex}</div>
                  <div className='signerAccountAddress'>{address.substr(0, 11)} {svg.octicon('kebab-horizontal', { height: 20 })} {address.substr(address.length - 10)}</div>
                  <div className='signerAccountCheck' />
                </div>
              )
            })}</div>
            <div className='signerBottom'>
              <div className='signerBottomPageBack' onMouseDown={() => this.nextPage(true)}>{svg.triangleLeft(20)}</div>
              <div className='signerBottomPages'>{(page + 1) + ' / ' + Math.ceil(signer.addresses.length / addressLimit)}</div>
              <div className='signerBottomPageNext' onMouseDown={() => this.nextPage()}>{svg.triangleLeft(20)}</div>
            </div>
          </>
        ) : this.props.type === 'trezor' && (status === 'need pin' || status === 'enter passphrase') ? (
          <div className='signerInterface'>
            {this.renderTrezorPin(this.props.type === 'trezor' && status === 'need pin')}
            {this.renderTrezorPhrase(this.props.type === 'trezor' && status === 'enter passphrase')}
          </div> 
        ) : loading ? (
          <div className='signerLoading'>
            <div className='signerLoadingLoader' />
          </div>
        ): <></>}
        {disconnected || this.props.inSetup ? null : (
          <div className='signerDrawer'>
            <div className='showControls' onMouseDown={() => this.setState({ showControls: !this.state.showControls })}>
              {this.state.showControls ? 'hide' : 'more'}
            </div>
            <div className='showControlsLine' />
          </div>
        )}
        {this.state.showControls || disconnected ? (
          <div className='signerControls cardShow'>
            {!!permissionId ? (
              <div className='signerControlDetail'>
                <div className='signerControlDetailKey'>
                  {'PERMISSION ID:'}
                </div>
                <div className='signerControlDetailValue'>
                  {permissionId}
                </div>
              </div>
            ) : null}
            {canReconnect ? this.reconnectButton(hwSigner) : null}
            <div className='signerControlOption signerControlOptionImportant' onMouseDown={() => {
              link.send('dash:removeSigner', this.props.id)
            }}>Remove Signer</div>
            </div>
        ) : null}
      </div>
    )
  }
}

export default Restore.connect(Signer)
