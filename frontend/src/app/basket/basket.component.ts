import { TranslateService } from '@ngx-translate/core'
import { QrCodeComponent } from '../qr-code/qr-code.component'
import { MatDialog } from '@angular/material/dialog'
import { FormControl, Validators } from '@angular/forms'
import { WindowRefService } from '../Services/window-ref.service'
import { ConfigurationService } from '../Services/configuration.service'
import { UserService } from '../Services/user.service'
import { BasketService } from '../Services/basket.service'
import { Component, OnInit } from '@angular/core'
import { library, dom } from '@fortawesome/fontawesome-svg-core'
import {
  faCartArrowDown,
  faCreditCard,
  faGift,
  faCoins,
  faHeart,
  faMinusSquare,
  faPlusSquare,
  faThumbsUp,
  faTshirt,
  faStickyNote,
  faHandHoldingUsd,
  faCoffee
} from '@fortawesome/free-solid-svg-icons'
import { faCreditCard as faCredit, faTrashAlt } from '@fortawesome/free-regular-svg-icons/'
import { faBtc, faEthereum, faPaypal, faLeanpub, faPatreon } from '@fortawesome/free-brands-svg-icons'

library.add(faMinusSquare, faPlusSquare, faCartArrowDown, faGift, faCoins, faCreditCard, faTrashAlt, faHeart, faBtc, faPaypal, faLeanpub, faEthereum, faCredit, faThumbsUp, faTshirt, faStickyNote, faHandHoldingUsd, faCoffee, faPatreon)
dom.watch()

@Component({
  selector: 'app-basket',
  templateUrl: './basket.component.html',
  styleUrls: ['./basket.component.scss']
})

export class BasketComponent implements OnInit {

  public userEmail: string
  public displayedColumns = ['product','price','quantity','total price','remove']
  public dataSource = []
  public currentRewardPoints: number
  public bonus = 0
  public couponPanelExpanded: boolean = false
  public paymentPanelExpanded: boolean = false
  public pointAmountExpanded: boolean = false
  public couponControl: FormControl = new FormControl('',[Validators.required, Validators.minLength(10), Validators.maxLength(10)])
  public points: FormControl = undefined  // Will be filled in load() as currentRewardPoints needs to be filled first
  public error = undefined
  public confirmation = undefined
  public twitterUrl = null
  public facebookUrl = null
  public applicationName = 'OWASP Juice Shop'
  public redirectUrl = null
  public clientDate: any
  private campaignCoupon: string
  public appliedPoints: number

  constructor (private dialog: MatDialog,private basketService: BasketService,private userService: UserService,private windowRefService: WindowRefService,private configurationService: ConfigurationService,private translate: TranslateService) {}

  ngOnInit () {
    this.load()
    this.userService.whoAmI().subscribe((data) => {
      this.userEmail = data.email || 'anonymous'
      this.userEmail = '(' + this.userEmail + ')'
    },(err) => console.log(err))

    this.couponPanelExpanded = localStorage.getItem('couponPanelExpanded') ? JSON.parse(localStorage.getItem('couponPanelExpanded')) : false
    this.paymentPanelExpanded = localStorage.getItem('paymentPanelExpanded') ? JSON.parse(localStorage.getItem('paymentPanelExpanded')) : false
    this.pointAmountExpanded = localStorage.getItem('pointAmountExpanded') ? JSON.parse(localStorage.getItem('pointAmountExpanded')) : false

    this.configurationService.getApplicationConfiguration().subscribe((config) => {
      if (config && config.application) {
        if (config.application.twitterUrl !== null) {
          this.twitterUrl = config.application.twitterUrl
        }
        if (config.application.facebookUrl !== null) {
          this.facebookUrl = config.application.facebookUrl
        }
        if (config.application.name !== null) {
          this.applicationName = config.application.name
        }
      }
    },(err) => console.log(err))
  }
  
  load () {
    this.basketService.find(sessionStorage.getItem('bid')).subscribe((basket) => {
      this.dataSource = basket.Products
      let bonusPoints = 0
      let pointsCurrency = 0;
      let pointsPercentage = 0;
      let totalPrice = 0;
      let maxDiscount = 0;
      let usedPoints = this.appliedPoints;
    this.userService.whoAmI().subscribe((user) => {
      this.basketService.getBonus(user.id).subscribe((rewardPoints) => {
        this.currentRewardPoints = rewardPoints.amount;
        this.points = new FormControl('',[Validators.required, Validators.maxLength(3), Validators.minLength(0), Validators.pattern('[0-9]*'), Validators.max(this.currentRewardPoints)]) //maxlength doesnt work yet, still fixing
      })
    })
 
    
      basket.Products.map(product => {
        if (product.BasketItem && product.BasketItem.quantity) {
          totalPrice = (product.price) * product.BasketItem.quantity;
          maxDiscount = Math.floor((totalPrice/100) * 25);

          pointsCurrency = Math.floor(this.appliedPoints*0.5);
          pointsPercentage = (pointsCurrency/totalPrice)*100;
        }
        
        if (pointsCurrency > maxDiscount){
          this.points.setValue(0)
          usedPoints = 0
          console.log("error, using to much points");
        }

        if(usedPoints>0){
          totalPrice = (totalPrice - pointsCurrency);
          bonusPoints = Math.floor(totalPrice *0.1);
        }

        else {
          bonusPoints = Math.floor(totalPrice *0.1);
          
          
        }    
      }) 
      this.bonus = bonusPoints
      console.log(bonusPoints);
    }
    ,(err) => console.log(err)) 
  }

  applyPoints () {
    if (this.points.value <= 999 && this.points.value >= 0){
      if (this.points.value == 0){
        this.appliedPoints = 0;
      }
      else{
      this.appliedPoints = this.points.value 
      }
    }  
    else{
    this.error = { error: 'Amount needs to be between 0 and 999.' } //BETTER ERROR MESSAGE TO BE THERE
    this.points.setValue(0)
    this.appliedPoints = 0
  }
  this.load();
  }


  delete (id) {
    this.basketService.del(id).subscribe(() => {
      this.load()
    }, (err) => console.log(err))
  }

  inc (id) {
    this.addToQuantity(id,1)
  }

  dec (id) {
    this.addToQuantity(id,-1)
  }

  incReward () {
    this.userService.whoAmI().subscribe((data) => {
      this.addToReward(data.id, 1)
    })
  }

  addToQuantity (id,value) {
    this.basketService.get(id).subscribe((basketItem) => {
      let newQuantity = basketItem.quantity + value
      this.basketService.putBonus(id, { quantity: newQuantity < 1 ? 1 : newQuantity }).subscribe(() => {
        this.load()
      },(err) => console.log(err))
    }, (err) => console.log(err))
  }

  addToReward (id,value) {
    this.basketService.getBonus(id).subscribe((data) => {
      let newBonus = data.amount + value
      this.basketService.putBonus(id, { amount: newBonus }).subscribe((data) => {
        console.log(data.amount)
        this.load()
      },(err) => console.log(err))
    }, (err) => console.log(err))
  }

  toggleCoupon () {
    this.couponPanelExpanded = !this.couponPanelExpanded
    localStorage.setItem('couponPanelExpanded',JSON.stringify(this.couponPanelExpanded))
  }

  togglePayment () {
    this.paymentPanelExpanded = !this.paymentPanelExpanded
    localStorage.setItem('paymentPanelExpanded',JSON.stringify(this.paymentPanelExpanded))
  }

  togglePoint () {
    this.pointAmountExpanded = !this.pointAmountExpanded
    localStorage.setItem('pointAmountExpanded',JSON.stringify(this.pointAmountExpanded))
  }

  checkout () {
    this.basketService.checkout(sessionStorage.getItem('bid'), btoa(this.campaignCoupon + '-' + this.clientDate)).subscribe((orderConfirmationPath) => {
      this.redirectUrl = this.basketService.hostServer + orderConfirmationPath
      this.windowRefService.nativeWindow.location.replace(this.redirectUrl)
    }, (err) => console.log(err))
  }

  applyCoupon () {
    this.campaignCoupon = this.couponControl.value
    this.clientDate = new Date()
    this.clientDate.setHours(0,0,0,0)
    this.clientDate = this.clientDate.getTime()
    if (this.couponControl.value === 'WMNSDY2019') { // TODO Use internal code table or retrieve from AWS Lambda instead
      if (this.clientDate === 1551999600000) { // = Mar 08, 2019
        this.showConfirmation(75)
      } else {
        this.confirmation = undefined
        this.error = { error: 'Invalid Coupon.' } // FIXME i18n error message
        this.resetForm()
      }
    } else {
      this.basketService.applyCoupon(sessionStorage.getItem('bid'), encodeURIComponent(this.couponControl.value)).subscribe((discount: any) => {
        this.showConfirmation(discount)
      },(err) => {
        this.confirmation = undefined
        this.error = err
        this.resetForm()
      })
    }
  }

  showConfirmation (discount) {
    this.resetForm()
    this.error = undefined
    this.translate.get('DISCOUNT_APPLIED', { discount }).subscribe((discountApplied) => {
      this.confirmation = discountApplied
    }, (translationId) => {
      this.confirmation = translationId
    })
  }

  showBitcoinQrCode () {
    this.dialog.open(QrCodeComponent, {
      data: {
        data: 'bitcoin:1AbKfgvw9psQ41NbLi8kufDQTezwG8DRZm',
        url: '/redirect?to=https://blockchain.info/address/1AbKfgvw9psQ41NbLi8kufDQTezwG8DRZm',
        address: '1AbKfgvw9psQ41NbLi8kufDQTezwG8DRZm',
        title: 'TITLE_BITCOIN_ADDRESS'
      }
    })
  }

  showDashQrCode () {
    this.dialog.open(QrCodeComponent, {
      data: {
        data: 'dash:Xr556RzuwX6hg5EGpkybbv5RanJoZN17kW',
        url: '/redirect?to=https://explorer.dash.org/address/Xr556RzuwX6hg5EGpkybbv5RanJoZN17kW',
        address: 'Xr556RzuwX6hg5EGpkybbv5RanJoZN17kW',
        title: 'TITLE_DASH_ADDRESS'
      }
    })
  }

  showEtherQrCode () {
    this.dialog.open(QrCodeComponent, {
      data: {
        data: '0x0f933ab9fCAAA782D0279C300D73750e1311EAE6',
        url: 'https://etherscan.io/address/0x0f933ab9fcaaa782d0279c300d73750e1311eae6',
        address: '0x0f933ab9fCAAA782D0279C300D73750e1311EAE6',
        title: 'TITLE_ETHER_ADDRESS'
      }
    })
  }

  resetForm () {
    this.couponControl.setValue('')
    this.couponControl.markAsPristine()
    this.couponControl.markAsUntouched()
  }  
}
